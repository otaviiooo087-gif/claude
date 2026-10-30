import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import * as D from './domain.js';
import { parseCsv, importRows } from './importers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = (s, d = []) => { try { return JSON.parse(s ?? ''); } catch { return d; } };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

export function createApp(db) {
  const principalFor = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return null;
    const h = D.sha256(m[1]);
    const u = db.prepare('SELECT * FROM users WHERE token_hash=?').get(h);
    if (u) return { kind: 'admin', id: u.id, name: u.name, companies: db.prepare('SELECT company_id FROM user_companies WHERE user_id=?').all(u.id).map((x) => x.company_id) };
    const a = db.prepare('SELECT * FROM agents WHERE token_hash=?').get(h);
    if (a) return { kind: 'agent', id: a.id, name: a.name, companies: [a.company_id] };
    return null;
  };

  const contentRow = (company, c) => ({
    ...c, status: D.contentStatus(db, company, c),
    version_info: D.getVersion(db, company, c.id, c.current_version),
  });

  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

  // ---- leitura ----
  route('GET', '/api/me', ({ p }) => ({ kind: p.kind, id: p.id, name: p.name, companies: p.companies.map((id) => db.prepare('SELECT * FROM companies WHERE id=?').get(id)) }));

  route('GET', '/api/contents', ({ company, q }) => {
    let rows = db.prepare('SELECT * FROM contents WHERE company_id=? ORDER BY id').all(company).map((c) => contentRow(company, c));
    if (q.status) rows = rows.filter((r) => r.status === q.status);
    if (q.channel) rows = rows.filter((r) => r.version_info.channels.includes(q.channel));
    if (q.service) rows = rows.filter((r) => r.service === q.service);
    return rows;
  });

  route('GET', '/api/contents/:id', ({ company, params }) => {
    const c = D.getContent(db, company, params.id);
    const versions = db.prepare('SELECT * FROM content_versions WHERE content_id=? AND company_id=? ORDER BY version').all(c.id, company).map((v) => ({ ...v, channels: J(v.channels) }));
    const approvals = db.prepare('SELECT * FROM approvals WHERE content_id=? AND company_id=? ORDER BY decided_at, rowid').all(c.id, company)
      .map((a) => ({ ...a, scope: J(a.scope_json, {}), target_ids: J(a.target_ids), flags: J(a.flags), validity: D.approvalValidity(db, a) }));
    return {
      ...contentRow(company, c), versions, approvals,
      files: db.prepare('SELECT * FROM files WHERE content_id=? AND company_id=? ORDER BY version, name').all(c.id, company),
      targets: db.prepare('SELECT * FROM targets WHERE content_id=? AND company_id=? ORDER BY version, id').all(c.id, company).map((t) => ({ ...t, file_ids: J(t.file_ids) })),
      publications: db.prepare('SELECT * FROM publications WHERE content_id=? AND company_id=? ORDER BY scheduled_for').all(c.id, company),
      tasks: db.prepare('SELECT * FROM tasks WHERE content_id=? AND company_id=?').all(c.id, company),
      history: db.prepare("SELECT * FROM audit_log WHERE company_id=? AND ((entity='content' AND entity_id=?) OR (entity IN ('file','target','approval','publication','task') AND details LIKE ?)) ORDER BY id DESC LIMIT 100")
        .all(company, c.id, `%${c.id}%`),
    };
  });

  route('GET', '/api/approvals', ({ company }) => {
    const out = { CRIACAO: [], DISTRIBUICAO: [] };
    for (const c of db.prepare('SELECT * FROM contents WHERE company_id=? ORDER BY id').all(company)) {
      const st = D.contentStatus(db, company, c); const v = D.getVersion(db, company, c.id, c.current_version);
      const row = { content_id: c.id, title: c.title, version: c.current_version, status: st, channels: v.channels };
      if (['AGUARDANDO_AUTORIZACAO_CRIACAO', 'EM_REVISAO_CRIACAO'].includes(st)) out.CRIACAO.push(row);
      if (['MATERIAL_ENTREGUE_AGUARDANDO_REVISAO', 'EM_REVISAO_DISTRIBUICAO'].includes(st)) out.DISTRIBUICAO.push(row);
    }
    return out;
  });

  route('GET', '/api/library', ({ company, q }) => {
    const rows = db.prepare(`SELECT f.*, c.title AS content_title FROM files f JOIN contents c ON c.id=f.content_id WHERE f.company_id=? ORDER BY f.content_id, f.version, f.name`).all(company);
    return q.kind ? rows.filter((r) => r.kind === q.kind) : rows;
  });

  route('GET', '/api/market', ({ company, q }) => {
    const rows = db.prepare('SELECT * FROM market_items WHERE company_id=? ORDER BY COALESCE(published_at, collected_at) DESC').all(company)
      .map((r) => ({ ...r, data: J(r.data, {}) }));
    return {
      sources: db.prepare('SELECT * FROM market_sources WHERE company_id=?').all(company),
      items: q.kind ? rows.filter((r) => r.kind === q.kind) : rows,
      notice: 'Pesquisa não autoriza produção nem publicação. FATO = dado coletado; INTERPRETACAO = leitura do agente; SUGESTAO = pauta proposta.',
    };
  });

  route('GET', '/api/agents', ({ company }) => db.prepare('SELECT id,company_id,name,role,capabilities,integration,config,state,last_activity_at,last_run_summary FROM agents WHERE company_id=?').all(company)
    .map((a) => ({ ...a, capabilities: J(a.capabilities), config: J(a.config, {}) })));

  route('GET', '/api/tasks', ({ company }) => db.prepare('SELECT * FROM tasks WHERE company_id=? ORDER BY due_at').all(company).map((t) => ({
    ...t, depends_on: J(t.depends_on), errors: J(t.errors), evidence: J(t.evidence),
    overdue: !!t.due_at && !['CONCLUIDA'].includes(t.status) && t.due_at < new Date().toISOString(),
  })));

  route('GET', '/api/publications', ({ company }) => db.prepare(`SELECT p.*, c.title AS content_title, t.destination, t.audience, a.label AS account_label, a.status AS account_status
    FROM publications p JOIN contents c ON c.id=p.content_id JOIN targets t ON t.id=p.target_id LEFT JOIN accounts a ON a.id=p.account_id
    WHERE p.company_id=? ORDER BY p.scheduled_for`).all(company));

  route('GET', '/api/accounts', ({ company }) => db.prepare('SELECT * FROM accounts WHERE company_id=?').all(company));
  route('GET', '/api/integrations', ({ company }) => db.prepare('SELECT * FROM integrations WHERE company_id=?').all(company));
  route('GET', '/api/audit', ({ company }) => db.prepare('SELECT * FROM audit_log WHERE company_id=? ORDER BY id DESC LIMIT 200').all(company));

  route('GET', '/api/dashboard', ({ company }) => {
    const now = new Date().toISOString();
    const contents = db.prepare('SELECT * FROM contents WHERE company_id=?').all(company).map((c) => ({ id: c.id, title: c.title, status: D.contentStatus(db, company, c) }));
    const by = (...s) => contents.filter((c) => s.includes(c.status));
    return {
      pendentes_criacao: by('AGUARDANDO_AUTORIZACAO_CRIACAO', 'EM_REVISAO_CRIACAO'),
      pendentes_distribuicao: by('MATERIAL_ENTREGUE_AGUARDANDO_REVISAO', 'EM_REVISAO_DISTRIBUICAO'),
      tarefas_atrasadas: db.prepare("SELECT id,title,due_at,status,agent_id FROM tasks WHERE company_id=? AND status NOT IN ('CONCLUIDA') AND due_at IS NOT NULL AND due_at<?").all(company, now),
      proximas_publicacoes: db.prepare("SELECT p.id,p.content_id,p.channel,p.scheduled_for,p.status,p.simulated FROM publications p WHERE p.company_id=? AND p.status IN ('AGENDADO','EM_PUBLICACAO') ORDER BY scheduled_for LIMIT 10").all(company),
      publicacoes_com_problema: db.prepare("SELECT id,content_id,channel,status,last_error,external_cancel_pending FROM publications WHERE company_id=? AND status IN ('FALHA','RESULTADO_INCERTO')").all(company),
      janelas_sem_publicacao: db.prepare(`SELECT t.id, t.content_id, t.channel, t.window_start, t.window_end FROM targets t WHERE t.company_id=? AND t.status='ATIVO' AND t.window_end<?
        AND NOT EXISTS (SELECT 1 FROM publications p WHERE p.target_id=t.id AND p.status IN ('AGENDADO','EM_PUBLICACAO','PUBLICADO','RESULTADO_INCERTO'))`).all(company, now),
      integracoes: db.prepare('SELECT * FROM integrations WHERE company_id=?').all(company),
      agentes: db.prepare('SELECT id,name,state,last_activity_at,last_run_summary FROM agents WHERE company_id=?').all(company),
      contagem_por_status: contents.reduce((m, c) => ((m[c.status] = (m[c.status] ?? 0) + 1), m), {}),
    };
  });

  // ---- escrita ----
  route('POST', '/api/contents', ({ p, company, body }) => ({ id: D.createContent(db, p, company, body) }));
  route('POST', '/api/contents/:id/revise', ({ p, company, params, body }) => D.reviseContent(db, p, company, params.id, body.patch ?? {}, body.reason));
  route('POST', '/api/files', ({ p, company, body }) => ({ id: D.addFile(db, p, company, body) }));
  route('POST', '/api/files/:id/verify', ({ p, company, params, body }) => (D.verifyFile(db, p, company, params.id, body), { ok: true }));
  route('POST', '/api/files/:id/replace', ({ p, company, params, body }) => ({ id: D.replaceFile(db, p, company, params.id, body) }));
  route('POST', '/api/targets', ({ p, company, body }) => ({ id: D.upsertTarget(db, p, company, body) }));
  route('POST', '/api/approvals', ({ p, company, body }) => D.decide(db, p, company, body));
  route('POST', '/api/publications', ({ p, company, body }) => ({ id: D.schedulePublication(db, p, company, body) }));
  route('POST', '/api/publications/:id/transition', ({ p, company, params, body }) => (D.transitionPublication(db, p, company, params.id, body.to, body), { ok: true }));
  route('POST', '/api/tasks', ({ p, company, body }) => ({ id: D.createTask(db, p, company, body) }));
  route('POST', '/api/tasks/:id', ({ p, company, params, body }) => (D.updateTask(db, p, company, params.id, body), { ok: true }));
  route('POST', '/api/market/import', ({ p, company, body }) => {
    D.assertCompany(db, p, company);
    if (p.kind !== 'admin') throw new D.DomainError('SOMENTE_ADMIN', 'Importação manual é restrita ao administrador', 403);
    const src = body.source_id ? db.prepare('SELECT * FROM market_sources WHERE id=? AND company_id=?').get(body.source_id, company) : null;
    return importRows(db, p, company, body.kind, parseCsv(body.csv ?? ''), src ?? {});
  });
  route('POST', '/api/accounts/:id/verify', ({ p, company, params, body }) => {
    if (p.kind !== 'admin') throw new D.DomainError('SOMENTE_ADMIN', 'Somente o administrador confirma identidade de conta', 403);
    D.assertCompany(db, p, company);
    if (!body.note) throw new D.DomainError('EVIDENCIA_OBRIGATORIA', 'Descreva como a identidade/conexão foi conferida');
    const r = db.prepare("UPDATE accounts SET status='VERIFICADA', verified_at=?, verified_by=?, note=? WHERE id=? AND company_id=?").run(new Date().toISOString(), p.name, body.note, params.id, company);
    if (!r.changes) throw new D.DomainError('CONTA_INEXISTENTE', 'Conta não encontrada', 404);
    D.audit(db, company, 'account', params.id, 'VERIFICADA', p, body);
    return { ok: true };
  });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
    if (!url.pathname.startsWith('/api/')) {
      if (url.pathname === '/healthz') return send(200, { ok: true });
      const rel = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
      const f = join(ROOT, 'public', rel);
      if (!f.startsWith(join(ROOT, 'public')) || !existsSync(f)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); return res.end(readFileSync(f));
    }
    try {
      const p = principalFor(req);
      if (!p) return send(401, { code: 'NAO_AUTENTICADO', message: 'Token ausente ou inválido' });
      const company = req.headers['x-company'] || p.companies[0];
      if (!p.companies.includes(company)) return send(403, { code: 'SEM_ACESSO', message: 'Sem acesso a esta empresa' });
      let body = {};
      if (req.method === 'POST') {
        const chunks = []; let size = 0;
        for await (const ch of req) { size += ch.length; if (size > 2_000_000) return send(413, { code: 'MUITO_GRANDE', message: 'Corpo acima de 2MB' }); chunks.push(ch); }
        try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { return send(400, { code: 'JSON_INVALIDO', message: 'JSON inválido' }); }
      }
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname); if (!m) continue;
        return send(200, await r.fn({ p, company, params: { ...m.groups }, q: Object.fromEntries(url.searchParams), body }));
      }
      return send(404, { code: 'ROTA_INEXISTENTE', message: 'Rota inexistente' });
    } catch (e) {
      if (e instanceof D.DomainError) return send(e.status, { code: e.code, message: e.message });
      console.error(e); return send(500, { code: 'ERRO_INTERNO', message: 'Erro interno' });
    }
  }
  return createServer(handle);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dbPath = process.env.RDZ_DB || join(ROOT, 'data', 'rdz.sqlite');
  const db = openDb(dbPath);
  if (!db.prepare('SELECT 1 FROM companies LIMIT 1').get()) console.warn('Banco vazio. Rode: npm run seed');
  const port = Number(process.env.PORT || 8787);
  createApp(db).listen(port, '127.0.0.1', () => console.log(`RDZ Central em http://127.0.0.1:${port}`));
}
