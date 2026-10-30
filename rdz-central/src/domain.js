import { createHash, randomUUID } from 'node:crypto';
import { tx } from './db.js';

export class DomainError extends Error {
  constructor(code, message, status = 422) { super(message); this.code = code; this.status = status; }
}
const fail = (code, msg, status) => { throw new DomainError(code, msg, status); };

export const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const canon = (v) => JSON.stringify(v, (_, x) =>
  x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
export const scopeHash = (scope) => sha256(canon(scope));
const now = () => new Date().toISOString();
const uid = (p) => `${p}_${randomUUID().slice(0, 8)}`;
const J = (s, d = []) => { try { return JSON.parse(s ?? ''); } catch { return d; } };

export const CHANNELS = ['INSTAGRAM', 'TIKTOK', 'WHATSAPP', 'LINKEDIN'];

// principal = { kind: 'admin'|'agent', id, name, companies: [ids] }
export async function audit(db, company, entity, entityId, action, actor, details) {
  (await db.prepare('INSERT INTO audit_log(company_id,entity,entity_id,action,actor,at,details) VALUES(?,?,?,?,?,?,?)')
    .run(company, entity, entityId, action, `${actor.kind}:${actor.id}`, now(), details ? JSON.stringify(details) : null));
}

export async function assertCompany(db, principal, companyId) {
  const c = (await db.prepare('SELECT id FROM companies WHERE id=?').get(companyId));
  if (!c) fail('EMPRESA_INEXISTENTE', `Empresa ${companyId} não existe`, 404);
  if (!principal.companies.includes(companyId)) fail('SEM_ACESSO', 'Sem acesso a esta empresa', 403);
}

// ---------- conteúdos e versões ----------
export async function getContent(db, company, id) {
  const c = (await db.prepare('SELECT * FROM contents WHERE id=? AND company_id=?').get(id, company));
  if (!c) fail('CONTEUDO_INEXISTENTE', `Conteúdo ${id} não encontrado`, 404);
  return c;
}
export async function getVersion(db, company, id, version) {
  const v = (await db.prepare('SELECT * FROM content_versions WHERE content_id=? AND version=? AND company_id=?').get(id, version, company));
  if (!v) fail('VERSAO_INEXISTENTE', `Versão ${version} de ${id} não encontrada`, 404);
  return { ...v, channels: J(v.channels) };
}

export async function createContent(db, p, company, d) {
  (await assertCompany(db, p, company));
  if (!d.id || !d.title) fail('DADOS_INVALIDOS', 'id e title são obrigatórios');
  if ((await db.prepare('SELECT 1 FROM contents WHERE id=?').get(d.id))) fail('ID_DUPLICADO', `Já existe conteúdo ${d.id}`, 409);
  return await tx(db, async () => {
    (await db.prepare(`INSERT INTO contents(id,company_id,title,kind,service,objective,audience,owner,origin_ref,current_version,created_at,created_by)
      VALUES(?,?,?,?,?,?,?,?,?,1,?,?)`).run(d.id, company, d.title, d.kind ?? 'VIDEO', d.service ?? null, d.objective ?? null,
      d.audience ?? null, d.owner ?? null, d.origin_ref ?? null, now(), `${p.kind}:${p.id}`));
    (await insertVersion(db, p, company, d.id, 1, d, 'Criação do conteúdo'));
    (await audit(db, company, 'content', d.id, 'CRIADO', p, { title: d.title }));
    return d.id;
  });
}

async function insertVersion(db, p, company, id, version, d, reason) {
  (await db.prepare(`INSERT INTO content_versions(content_id,version,company_id,brief,text,text_sha256,declared_sha256,channels,planned_for,reason,created_at,created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, version, company, d.brief ?? null, d.text ?? null,
    d.text != null ? sha256(d.text) : null, d.declared_sha256 ?? null, JSON.stringify([...(d.channels ?? [])].sort()),
    d.planned_for ?? null, reason, now(), `${p.kind}:${p.id}`));
}

const hasApproval = async (db, company, id, version) => !!(await db.prepare(
  "SELECT 1 FROM approvals WHERE content_id=? AND company_id=? AND version=? AND decision='APROVADO'").get(id, company, version));

// Altera texto/planejamento. Se a versão atual já recebeu qualquer aprovação, cria nova versão
// (a anterior e suas aprovações permanecem no histórico, marcadas como invalidadas).
export async function reviseContent(db, p, company, id, patch, reason) {
  (await assertCompany(db, p, company));
  const c = (await getContent(db, company, id));
  const cur = (await getVersion(db, company, id, c.current_version));
  const next = {
    brief: patch.brief ?? cur.brief, text: patch.text ?? cur.text, channels: patch.channels ?? cur.channels,
    planned_for: patch.planned_for ?? cur.planned_for, declared_sha256: patch.declared_sha256 ?? cur.declared_sha256,
  };
  const changed = ['brief', 'text', 'planned_for'].some((k) => next[k] !== cur[k])
    || JSON.stringify([...next.channels].sort()) !== JSON.stringify(cur.channels);
  const metaChanged = ['title', 'service', 'objective', 'audience', 'owner'].some((k) => patch[k] !== undefined && patch[k] !== c[k]);
  if (!changed && !metaChanged) return { version: c.current_version, bumped: false };
  return await tx(db, async () => {
    let version = c.current_version; let bumped = false;
    const needsBump = (await hasApproval(db, company, id, version));
    if (needsBump) {
      version += 1; bumped = true;
      (await insertVersion(db, p, company, id, version, next, reason || 'Revisão'));
      // targets e arquivos ativos são copiados para a nova versão (novos IDs; os antigos ficam no histórico)
      const map = new Map();
      for (const f of (await db.prepare("SELECT * FROM files WHERE content_id=? AND company_id=? AND version=? AND status='ATIVO'").all(id, company, c.current_version))) {
        const nid = uid('file'); map.set(f.id, nid);
        (await db.prepare(`INSERT INTO files(id,company_id,content_id,version,kind,channel,name,drive_id,drive_url,size,mime,fingerprint,status,verification_level,verified_by,verified_at,verification_note,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'ATIVO',?,?,?,?,?)`).run(nid, company, id, version, f.kind, f.channel, f.name, f.drive_id, f.drive_url, f.size, f.mime, f.fingerprint,
          f.verification_level, f.verified_by, f.verified_at, f.verification_note, now()));
      }
      for (const t of (await db.prepare("SELECT * FROM targets WHERE content_id=? AND company_id=? AND version=? AND status='ATIVO'").all(id, company, c.current_version))) {
        (await db.prepare(`INSERT INTO targets(id,company_id,content_id,version,channel,account_id,destination,audience,window_start,window_end,file_ids)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(uid('tgt'), company, id, version, t.channel, t.account_id, t.destination, t.audience, t.window_start, t.window_end,
          JSON.stringify(J(t.file_ids).map((x) => map.get(x)).filter(Boolean))));
      }
      (await db.prepare('UPDATE contents SET current_version=? WHERE id=?').run(version, id));
    } else if (changed) {
      (await db.prepare(`UPDATE content_versions SET brief=?,text=?,text_sha256=?,declared_sha256=?,channels=?,planned_for=? WHERE content_id=? AND version=?`)
        .run(next.brief, next.text, next.text != null ? sha256(next.text) : null, next.declared_sha256, JSON.stringify([...next.channels].sort()), next.planned_for, id, version));
    }
    for (const k of ['title', 'service', 'objective', 'audience', 'owner']) {
      if (patch[k] !== undefined) (await db.prepare(`UPDATE contents SET ${k}=? WHERE id=?`).run(patch[k], id));
    }
    (await audit(db, company, 'content', id, bumped ? 'NOVA_VERSAO' : 'ALTERADO', p, { version, reason }));
    (await reconcile(db, company, id, p, `Alteração no conteúdo (v${version})`));
    return { version, bumped };
  });
}

// ---------- arquivos e destinos ----------
export async function addFile(db, p, company, d) {
  (await assertCompany(db, p, company));
  const c = (await getContent(db, company, d.content_id));
  if (!d.name || !d.kind) fail('DADOS_INVALIDOS', 'name e kind são obrigatórios');
  const id = d.id || uid('file');
  const version = d.version ?? c.current_version;
  (await getVersion(db, company, c.id, version));
  await tx(db, async () => {
    (await db.prepare(`INSERT INTO files(id,company_id,content_id,version,kind,channel,name,drive_id,drive_url,size,mime,fingerprint,status,verification_level,verified_by,verified_at,verification_note,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'ATIVO',?,?,?,?,?)`).run(id, company, c.id, version, d.kind, d.channel ?? null, d.name, d.drive_id ?? null, d.drive_url ?? null,
      d.size ?? null, d.mime ?? null, d.fingerprint ?? null, d.verification_level ?? 'NAO_CONFERIDO', d.verified_by ?? null, d.verified_at ?? null, d.verification_note ?? null, now()));
    (await audit(db, company, 'file', id, 'REGISTRADO', p, { content: c.id, version, drive_id: d.drive_id }));
    (await reconcile(db, company, c.id, p, `Arquivo registrado: ${d.name}`));
  });
  return id;
}

export const VERIFICATION_LEVELS = ['NAO_CONFERIDO', 'RELATADO_PELO_AGENTE', 'EXISTE_NO_DRIVE', 'CONFERIDO_PELO_ADMIN'];

// Conferência: só admin atribui CONFERIDO_PELO_ADMIN. Divergência de tamanho invalida a autorização de distribuição.
export async function verifyFile(db, p, company, fileId, v) {
  (await assertCompany(db, p, company));
  const f = (await db.prepare('SELECT * FROM files WHERE id=? AND company_id=?').get(fileId, company));
  if (!f) fail('ARQUIVO_INEXISTENTE', 'Arquivo não encontrado', 404);
  if (!VERIFICATION_LEVELS.includes(v.level) || v.level === 'NAO_CONFERIDO') fail('NIVEL_INVALIDO', 'Nível de conferência inválido');
  if (v.level === 'CONFERIDO_PELO_ADMIN' && p.kind !== 'admin') fail('SOMENTE_ADMIN', 'Somente o administrador registra conferência humana', 403);
  await tx(db, async () => {
    const diverge = v.observed_size != null && f.size != null && Number(v.observed_size) !== Number(f.size);
    (await db.prepare('UPDATE files SET verification_level=?, verified_by=?, verified_at=?, verification_note=?, status=? WHERE id=?')
      .run(diverge ? 'NAO_CONFERIDO' : v.level, `${p.kind}:${p.name || p.id}`, now(), diverge ? `DIVERGENTE: tamanho observado ${v.observed_size} ≠ registrado ${f.size}. ${v.note ?? ''}` : v.note ?? null,
        diverge ? 'DIVERGENTE' : f.status, fileId));
    (await audit(db, company, 'file', fileId, diverge ? 'DIVERGENCIA' : 'CONFERIDO', p, v));
    (await reconcile(db, company, f.content_id, p, diverge ? `Arquivo divergente: ${f.name}` : `Conferência de arquivo: ${f.name}`));
  });
}

export async function replaceFile(db, p, company, fileId, patch) {
  const f = (await db.prepare('SELECT * FROM files WHERE id=? AND company_id=?').get(fileId, company));
  if (!f) fail('ARQUIVO_INEXISTENTE', 'Arquivo não encontrado', 404);
  return await tx(db, async () => {
    (await db.prepare("UPDATE files SET status='SUBSTITUIDO' WHERE id=?").run(fileId));
    const nid = (await addFile(db, p, company, { ...f, ...patch, id: undefined, content_id: f.content_id, version: f.version,
      verification_level: 'NAO_CONFERIDO', verified_by: null, verified_at: null, verification_note: null }));
    // alvos que apontavam para o arquivo antigo passam a apontar para o novo
    for (const t of (await db.prepare("SELECT * FROM targets WHERE content_id=? AND company_id=? AND version=? AND status='ATIVO'").all(f.content_id, company, f.version))) {
      const ids = J(t.file_ids); if (ids.includes(fileId)) {
        (await db.prepare('UPDATE targets SET file_ids=? WHERE id=?').run(JSON.stringify(ids.map((x) => (x === fileId ? nid : x))), t.id));
      }
    }
    (await audit(db, company, 'file', fileId, 'SUBSTITUIDO', p, { por: nid }));
    (await reconcile(db, company, f.content_id, p, `Arquivo substituído: ${f.name}`));
    return nid;
  });
}

const REQUIRED_TARGET = ['channel', 'account_id', 'destination', 'audience', 'window_start', 'window_end'];
export async function upsertTarget(db, p, company, d) {
  (await assertCompany(db, p, company));
  const c = (await getContent(db, company, d.content_id));
  const version = d.version ?? c.current_version;
  if (!CHANNELS.includes(d.channel)) fail('CANAL_INVALIDO', `Canal inválido: ${d.channel}`);
  if (d.account_id && !(await db.prepare('SELECT 1 FROM accounts WHERE id=? AND company_id=?').get(d.account_id, company))) fail('CONTA_INEXISTENTE', 'Conta não pertence a esta empresa');
  for (const fid of d.file_ids ?? []) {
    const f = (await db.prepare('SELECT 1 FROM files WHERE id=? AND company_id=? AND content_id=? AND version=?').get(fid, company, c.id, version));
    if (!f) fail('ARQUIVO_FORA_DA_VERSAO', `Arquivo ${fid} não pertence a ${c.id} v${version}`);
  }
  if (d.window_start && d.window_end && d.window_end < d.window_start) fail('JANELA_INVALIDA', 'Fim da janela anterior ao início');
  const id = d.id || uid('tgt');
  await tx(db, async () => {
    const exists = (await db.prepare('SELECT 1 FROM targets WHERE id=? AND company_id=?').get(id, company));
    if (exists) (await db.prepare(`UPDATE targets SET channel=?,account_id=?,destination=?,audience=?,window_start=?,window_end=?,file_ids=?,status=COALESCE(?,status) WHERE id=?`)
      .run(d.channel, d.account_id ?? null, d.destination ?? null, d.audience ?? null, d.window_start ?? null, d.window_end ?? null, JSON.stringify(d.file_ids ?? []), d.status ?? null, id));
    else (await db.prepare(`INSERT INTO targets(id,company_id,content_id,version,channel,account_id,destination,audience,window_start,window_end,file_ids) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, company, c.id, version, d.channel, d.account_id ?? null, d.destination ?? null, d.audience ?? null, d.window_start ?? null, d.window_end ?? null, JSON.stringify(d.file_ids ?? [])));
    (await audit(db, company, 'target', id, exists ? 'ALTERADO' : 'CRIADO', p, d));
    (await reconcile(db, company, c.id, p, `Destino ${exists ? 'alterado' : 'criado'}: ${d.channel}`));
  });
  return id;
}

// ---------- escopo de aprovação ----------
async function activeFiles(db, company, id, version) {
  return (await db.prepare("SELECT * FROM files WHERE content_id=? AND company_id=? AND version=? AND status='ATIVO' ORDER BY id").all(id, company, version));
}
async function targetSnapshot(db, company, t) {
  const files = [];
  for (const fid of J(t.file_ids)) { const f = await db.prepare('SELECT id,name,drive_id,size,fingerprint,status FROM files WHERE id=? AND company_id=?').get(fid, company); if (f) files.push(f); }
  return {
    id: t.id, channel: t.channel, account_id: t.account_id, destination: t.destination, audience: t.audience,
    window_start: t.window_start, window_end: t.window_end,
    files: files.map((f) => ({ id: f.id, name: f.name, drive_id: f.drive_id, size: f.size, fingerprint: f.fingerprint, status: f.status })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}
export async function buildScope(db, company, id, version, stage, targetIds = []) {
  const c = (await getContent(db, company, id));
  const v = (await getVersion(db, company, id, version));
  const base = { stage, content_id: id, version, text_sha256: v.text_sha256 };
  if (stage === 'CRIACAO') {
    return { ...base, brief_sha256: v.brief ? sha256(v.brief) : null, channels: v.channels, planned_for: v.planned_for,
      audience: c.audience, service: c.service, objective: c.objective };
  }
  const targets = [];
  for (const tid of [...targetIds].sort()) {
    const t = await db.prepare("SELECT * FROM targets WHERE id=? AND company_id=? AND content_id=? AND version=? AND status='ATIVO'").get(tid, company, id, version);
    targets.push(t ? await targetSnapshot(db, company, t) : { id: tid, missing: true });
  }
  return { ...base, targets };
}

export async function approvalValidity(db, a) {
  if (a.decision !== 'APROVADO') return { valid: false, reason: 'Decisão não é aprovação' };
  if (a.invalidated_at) return { valid: false, reason: a.invalidated_reason };
  const cur = (await db.prepare('SELECT current_version FROM contents WHERE id=?').get(a.content_id))?.current_version;
  if (cur !== a.version) return { valid: false, reason: `Versão atual é v${cur}` };
  const h = scopeHash((await buildScope(db, a.company_id, a.content_id, a.version, a.stage, J(a.target_ids))));
  return h === a.scope_hash ? { valid: true } : { valid: false, reason: 'Escopo alterado desde a aprovação' };
}

function diffScope(oldS, newS) {
  const out = [];
  for (const k of new Set([...Object.keys(oldS), ...Object.keys(newS)])) {
    if (k === 'targets') {
      const o = new Map((oldS.targets ?? []).map((t) => [t.id, t])); const n = new Map((newS.targets ?? []).map((t) => [t.id, t]));
      for (const [tid, t] of o) {
        const nt = n.get(tid);
        if (!nt || nt.missing) { out.push(`destino ${tid} removido`); continue; }
        for (const f of ['channel', 'account_id', 'destination', 'audience', 'window_start', 'window_end']) if (t[f] !== nt[f]) out.push(`destino ${tid}: ${f}`);
        if (canon(t.files) !== canon(nt.files)) out.push(`destino ${tid}: arquivos`);
      }
    } else if (canon(oldS[k]) !== canon(newS[k])) out.push(k);
  }
  return out;
}

// Invalida aprovações cujo escopo mudou; mantém o registro. Publicações agendadas sob elas falham com motivo explícito.
export async function reconcile(db, company, id, p, why) {
  const rows = (await db.prepare("SELECT * FROM approvals WHERE content_id=? AND company_id=? AND decision='APROVADO' AND invalidated_at IS NULL").all(id, company));
  const cur = (await getContent(db, company, id)).current_version;
  const out = [];
  for (const a of rows) {
    let reason = null;
    if (a.version !== cur) reason = `Nova versão v${cur} criada`;
    else {
      const ns = (await buildScope(db, company, id, a.version, a.stage, J(a.target_ids)));
      if (scopeHash(ns) !== a.scope_hash) reason = `Escopo alterado (${diffScope(J(a.scope_json, {}), ns).join(', ') || 'campos'})`;
    }
    if (!reason) continue;
    (await db.prepare('UPDATE approvals SET invalidated_at=?, invalidated_reason=? WHERE id=?').run(now(), `${reason}. ${why ?? ''}`.trim(), a.id));
    (await audit(db, company, 'approval', a.id, 'INVALIDADA', p, { reason, why }));
    out.push(a.id);
    for (const pub of (await db.prepare("SELECT * FROM publications WHERE approval_id=? AND status IN ('AGENDADO','EM_PUBLICACAO')").all(a.id))) {
      (await db.prepare("UPDATE publications SET status='FALHA', last_error=?, external_cancel_pending=?, updated_at=? WHERE id=?")
        .run('AUTORIZACAO_INVALIDADA: ' + reason, pub.provider_ref ? 1 : 0, now(), pub.id));
      (await audit(db, company, 'publication', pub.id, 'BLOQUEADA_POR_INVALIDACAO', p, { reason, cancelar_no_provedor: !!pub.provider_ref }));
    }
  }
  return out;
}

// ---------- decisões ----------
export async function decide(db, p, company, d) {
  if (p.kind !== 'admin') fail('SOMENTE_ADMIN', 'Somente o administrador decide aprovações; agentes não aprovam', 403);
  (await assertCompany(db, p, company));
  const c = (await getContent(db, company, d.content_id));
  const version = d.version;
  if (version !== c.current_version) fail('VERSAO_DESATUALIZADA', `A decisão deve referir-se à versão atual (v${c.current_version})`, 409);
  if (!['CRIACAO', 'DISTRIBUICAO'].includes(d.stage)) fail('ETAPA_INVALIDA', 'Etapa deve ser CRIACAO ou DISTRIBUICAO');
  if (!['APROVADO', 'AJUSTE_SOLICITADO', 'REPROVADO'].includes(d.decision)) fail('DECISAO_INVALIDA', 'Decisão inválida');
  if (d.decision !== 'APROVADO' && !d.comment) fail('COMENTARIO_OBRIGATORIO', 'Ajuste ou reprovação exigem comentário');
  const flags = [];
  let targetIds = [];
  if (d.stage === 'DISTRIBUICAO' && d.decision === 'APROVADO') {
    targetIds = [...new Set(d.target_ids ?? [])];
    if (!targetIds.length) fail('DESTINOS_NAO_INFORMADOS', 'Informe explicitamente os destinos autorizados');
    if (!(await hasValid(db, company, c.id, version, 'CRIACAO'))) fail('CRIACAO_NAO_AUTORIZADA', 'Autorize a criação desta versão antes de autorizar a distribuição');
    for (const tid of targetIds) {
      const t = (await db.prepare("SELECT * FROM targets WHERE id=? AND company_id=? AND content_id=? AND version=? AND status='ATIVO'").get(tid, company, c.id, version));
      if (!t) fail('DESTINO_INEXISTENTE', `Destino ${tid} não existe nesta versão`);
      const miss = REQUIRED_TARGET.filter((k) => !t[k]);
      if (miss.length) fail('DESTINO_INCOMPLETO', `Destino ${tid} sem: ${miss.join(', ')}`);
      const fids = J(t.file_ids);
      if (!fids.length) fail('DESTINO_SEM_ARQUIVO', `Destino ${tid} sem arquivos`);
      for (const fid of fids) {
        const f = (await db.prepare('SELECT * FROM files WHERE id=? AND company_id=?').get(fid, company));
        if (f.status !== 'ATIVO') fail('ARQUIVO_INVALIDO', `Arquivo ${f.name} está ${f.status}`);
        if (f.verification_level === 'NAO_CONFERIDO' || f.verification_level === 'RELATADO_PELO_AGENTE') flags.push(`ARQUIVO_SEM_CONFERENCIA_INDEPENDENTE:${f.name}`);
      }
      const acc = (await db.prepare('SELECT status FROM accounts WHERE id=? AND company_id=?').get(t.account_id, company));
      if (acc.status !== 'VERIFICADA') flags.push(`CONTA_NAO_VERIFICADA:${t.account_id}`);
    }
  }
  if (d.stage === 'CRIACAO' && d.decision === 'APROVADO' && (await activeFiles(db, company, c.id, version)).length) flags.push('RETROATIVA_MATERIAL_JA_PRODUZIDO');
  return await tx(db, async () => {
    const scope = (await buildScope(db, company, c.id, version, d.stage, targetIds));
    const id = uid('apr');
    (await db.prepare(`INSERT INTO approvals(id,company_id,content_id,version,stage,decision,scope_json,scope_hash,target_ids,comment,flags,decided_by,decided_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, company, c.id, version, d.stage, d.decision, canon(scope), scopeHash(scope), JSON.stringify(targetIds),
      d.comment ?? null, JSON.stringify(flags), p.name || p.id, now()));
    // uma nova decisão negativa/ajuste revoga aprovações vigentes da mesma etapa
    if (d.decision !== 'APROVADO') {
      for (const a of (await db.prepare("SELECT id FROM approvals WHERE content_id=? AND company_id=? AND stage=? AND decision='APROVADO' AND invalidated_at IS NULL").all(c.id, company, d.stage))) {
        (await db.prepare('UPDATE approvals SET invalidated_at=?, invalidated_reason=? WHERE id=?').run(now(), `Revogada por decisão ${d.decision} (${id})`, a.id));
      }
      (await reconcile(db, company, c.id, p, `Decisão ${d.decision}`));
    }
    (await audit(db, company, 'approval', id, d.decision, p, { stage: d.stage, version, flags }));
    return { id, scope_hash: scopeHash(scope), flags };
  });
}

export async function hasValid(db, company, id, version, stage) {
  const rows = await db.prepare("SELECT * FROM approvals WHERE content_id=? AND company_id=? AND version=? AND stage=? AND decision='APROVADO' AND invalidated_at IS NULL ORDER BY decided_at DESC")
    .all(id, company, version, stage);
  for (const a of rows) if ((await approvalValidity(db, a)).valid) return true;
  return false;
}

// ---------- status derivado ----------
export async function contentStatus(db, company, c) {
  const v = c.current_version;
  const last = async (stage) => (await db.prepare('SELECT * FROM approvals WHERE content_id=? AND company_id=? AND version=? AND stage=? ORDER BY decided_at DESC, seq DESC LIMIT 1').get(c.id, company, v, stage));
  const pubs = (await db.prepare('SELECT status FROM publications WHERE content_id=? AND company_id=? AND version=?').all(c.id, company, v)).map((x) => x.status);
  const c1 = await last('CRIACAO');
  if (pubs.length && pubs.every((s) => s === 'PUBLICADO')) return 'PUBLICADO';
  if (pubs.includes('RESULTADO_INCERTO')) return 'RESULTADO_INCERTO';
  if (pubs.includes('EM_PUBLICACAO')) return 'EM_PUBLICACAO';
  if (pubs.includes('AGENDADO')) return 'AGENDADO';
  if (!c1) return v > 1 ? 'EM_REVISAO_CRIACAO' : 'AGUARDANDO_AUTORIZACAO_CRIACAO';
  if (c1.decision === 'AJUSTE_SOLICITADO') return 'AJUSTE_SOLICITADO';
  if (c1.decision === 'REPROVADO') return 'REPROVADO';
  if (!(await approvalValidity(db, c1)).valid) return 'EM_REVISAO_CRIACAO';
  const files = (await activeFiles(db, company, c.id, v));
  if (!files.length) {
    const running = (await db.prepare("SELECT 1 FROM tasks WHERE content_id=? AND company_id=? AND status='EM_ANDAMENTO'").get(c.id, company));
    return running ? 'EM_PRODUCAO' : 'PRODUCAO_AUTORIZADA';
  }
  const d1 = await last('DISTRIBUICAO');
  if (d1?.decision === 'AJUSTE_SOLICITADO') return 'AJUSTE_SOLICITADO_DISTRIBUICAO';
  if (d1?.decision === 'REPROVADO') return 'DISTRIBUICAO_REPROVADA';
  if (d1?.decision === 'APROVADO' && (await approvalValidity(db, d1)).valid) return 'DISTRIBUICAO_AUTORIZADA';
  if (d1?.decision === 'APROVADO') return 'EM_REVISAO_DISTRIBUICAO';
  return 'MATERIAL_ENTREGUE_AGUARDANDO_REVISAO';
}

// ---------- publicações ----------
const TRANSITIONS = {
  AGENDADO: ['EM_PUBLICACAO', 'FALHA'],
  EM_PUBLICACAO: ['PUBLICADO', 'FALHA', 'RESULTADO_INCERTO'],
  RESULTADO_INCERTO: ['PUBLICADO', 'FALHA'],
  FALHA: ['AGENDADO'],
  PUBLICADO: [],
};

export async function schedulePublication(db, p, company, d) {
  (await assertCompany(db, p, company));
  const c = (await getContent(db, company, d.content_id));
  const t = (await db.prepare("SELECT * FROM targets WHERE id=? AND company_id=? AND content_id=? AND status='ATIVO'").get(d.target_id, company, c.id));
  if (!t) fail('DESTINO_INEXISTENTE', 'Destino não encontrado para este conteúdo', 404);
  if (t.version !== c.current_version) fail('VERSAO_DESATUALIZADA', 'Destino pertence a versão antiga');
  let apr = null;
  for (const a of await db.prepare("SELECT * FROM approvals WHERE content_id=? AND company_id=? AND version=? AND stage='DISTRIBUICAO' AND decision='APROVADO' AND invalidated_at IS NULL ORDER BY decided_at DESC")
    .all(c.id, company, t.version)) {
    if (J(a.target_ids).includes(t.id) && (await approvalValidity(db, a)).valid) { apr = a; break; }
  }
  if (!apr) fail('SEM_AUTORIZACAO_DISTRIBUICAO', 'Não há autorização de distribuição válida cobrindo este destino', 403);
  const when = new Date(d.scheduled_for).toISOString();
  if (when < new Date(t.window_start).toISOString() || when > new Date(t.window_end).toISOString()) fail('FORA_DA_JANELA', 'Horário fora da janela autorizada', 403);
  const acc = (await db.prepare('SELECT * FROM accounts WHERE id=? AND company_id=?').get(t.account_id, company));
  const provider = d.provider || 'manual';
  const simulated = provider === 'simulated' ? 1 : 0;
  if (provider === 'simulated' && process.env.RDZ_ALLOW_SIMULATION !== '1') fail('SIMULACAO_DESABILITADA', 'Provedor simulado desabilitado (RDZ_ALLOW_SIMULATION=1)');
  if (provider === 'metricool') {
    if (acc.status !== 'VERIFICADA') fail('CONTA_NAO_VERIFICADA', 'Conta Metricool ainda não verificada; confirme identidade e conexões antes de agendar');
    if (!process.env.METRICOOL_TOKEN) fail('METRICOOL_NAO_CONFIGURADO', 'Integração Metricool não configurada nesta instância', 501);
  }
  if (provider === 'manual' && !d.provider_ref) fail('REFERENCIA_OBRIGATORIA', 'Agendamento manual/externo exige referência (ex.: ID no Metricool ou na ferramenta usada)');
  const dup = (await db.prepare("SELECT id FROM publications WHERE target_id=? AND company_id=? AND status IN ('AGENDADO','EM_PUBLICACAO','PUBLICADO','RESULTADO_INCERTO')").get(t.id, company));
  if (dup) fail('PUBLICACAO_DUPLICADA', `Já existe publicação ${dup.id} ativa para este destino`, 409);
  const id = uid('pub');
  await tx(db, async () => {
    (await db.prepare(`INSERT INTO publications(id,company_id,content_id,version,target_id,approval_id,channel,account_id,provider,simulated,scheduled_for,status,provider_ref,created_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,'AGENDADO',?,?,?,?)`).run(id, company, c.id, t.version, t.id, apr.id, t.channel, t.account_id, provider, simulated, when,
      d.provider_ref ?? null, `${p.kind}:${p.id}`, now(), now()));
    (await audit(db, company, 'publication', id, 'AGENDADA', p, { approval: apr.id, provider, simulated: !!simulated, provider_ref: d.provider_ref }));
  });
  return id;
}

export async function transitionPublication(db, p, company, id, to, ev = {}) {
  (await assertCompany(db, p, company));
  const pub = (await db.prepare('SELECT * FROM publications WHERE id=? AND company_id=?').get(id, company));
  if (!pub) fail('PUBLICACAO_INEXISTENTE', 'Publicação não encontrada', 404);
  if (!TRANSITIONS[pub.status].includes(to)) fail('TRANSICAO_INVALIDA', `${pub.status} → ${to} não permitido`, 409);
  const apr = (await db.prepare('SELECT * FROM approvals WHERE id=?').get(pub.approval_id));
  if (['EM_PUBLICACAO', 'AGENDADO'].includes(to) && !(await approvalValidity(db, apr)).valid) {
    (await db.prepare("UPDATE publications SET status='FALHA', last_error=?, updated_at=? WHERE id=?").run('AUTORIZACAO_INVALIDADA: ' + (await (await approvalValidity(db, apr))).reason, now(), id));
    (await audit(db, company, 'publication', id, 'BLOQUEADA_NA_EXECUCAO', p, {}));
    fail('SEM_AUTORIZACAO_DISTRIBUICAO', 'Autorização deixou de ser válida; publicação bloqueada', 403);
  }
  if (to === 'PUBLICADO') {
    if (!ev.public_url && !(ev.evidence && String(ev.evidence).trim())) fail('EVIDENCIA_OBRIGATORIA', 'PUBLICADO exige link público ou evidência registrada');
    if (pub.status === 'RESULTADO_INCERTO' && p.kind !== 'admin') fail('SOMENTE_ADMIN', 'Somente o administrador resolve resultado incerto', 403);
  }
  if (to === 'FALHA' && !ev.error) fail('MOTIVO_OBRIGATORIO', 'FALHA exige motivo');
  if (to === 'RESULTADO_INCERTO' && !ev.error) fail('MOTIVO_OBRIGATORIO', 'RESULTADO_INCERTO exige descrição do que não pôde ser confirmado');
  if (pub.status === 'FALHA' && to === 'AGENDADO') {
    const when = ev.scheduled_for ? new Date(ev.scheduled_for).toISOString() : pub.scheduled_for;
    const t = (await db.prepare('SELECT * FROM targets WHERE id=?').get(pub.target_id));
    if (when < new Date(t.window_start).toISOString() || when > new Date(t.window_end).toISOString()) fail('FORA_DA_JANELA', 'Novo horário fora da janela autorizada', 403);
    ev.scheduled_for = when;
  }
  await tx(db, async () => {
    (await db.prepare(`UPDATE publications SET status=?, public_url=COALESCE(?,public_url), provider_ref=COALESCE(?,provider_ref), last_error=?, result_json=COALESCE(?,result_json),
      attempts=attempts+?, scheduled_for=COALESCE(?,scheduled_for), external_cancel_pending=CASE WHEN CAST(? AS TEXT)='AGENDADO' THEN 0 ELSE external_cancel_pending END, updated_at=? WHERE id=?`)
      .run(to, ev.public_url ?? null, ev.provider_ref ?? null, to === 'PUBLICADO' || to === 'AGENDADO' ? null : ev.error ?? null,
        ev.evidence ? JSON.stringify({ evidence: ev.evidence, by: p.name || p.id, at: now() }) : null, to === 'EM_PUBLICACAO' ? 1 : 0, ev.scheduled_for ?? null, to, now(), id));
    (await audit(db, company, 'publication', id, to, p, ev));
  });
}

// ---------- tarefas e agentes ----------
export async function createTask(db, p, company, d) {
  (await assertCompany(db, p, company));
  if (!d.title) fail('DADOS_INVALIDOS', 'title é obrigatório');
  if (d.content_id) (await getContent(db, company, d.content_id));
  if (d.agent_id && !(await db.prepare('SELECT 1 FROM agents WHERE id=? AND company_id=?').get(d.agent_id, company))) fail('AGENTE_INEXISTENTE', 'Agente não pertence a esta empresa');
  for (const dep of d.depends_on ?? []) if (!(await db.prepare('SELECT 1 FROM tasks WHERE id=? AND company_id=?').get(dep, company))) fail('DEPENDENCIA_INEXISTENTE', `Dependência ${dep} inexistente`);
  const id = d.id || uid('task');
  (await db.prepare(`INSERT INTO tasks(id,company_id,content_id,agent_id,title,input,expected_output,completion_criteria,owner,depends_on,priority,due_at,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'PENDENTE',?,?)`).run(id, company, d.content_id ?? null, d.agent_id ?? null, d.title, d.input ?? null, d.expected_output ?? null,
    d.completion_criteria ?? null, d.owner ?? null, JSON.stringify(d.depends_on ?? []), d.priority ?? 'MEDIA', d.due_at ?? null, now(), now()));
  (await audit(db, company, 'task', id, 'CRIADA', p, { title: d.title }));
  return id;
}

export async function updateTask(db, p, company, id, d) {
  (await assertCompany(db, p, company));
  const t = (await db.prepare('SELECT * FROM tasks WHERE id=? AND company_id=?').get(id, company));
  if (!t) fail('TAREFA_INEXISTENTE', 'Tarefa não encontrada', 404);
  const to = d.status;
  if (p.kind === 'agent') {
    const ag = (await db.prepare('SELECT id FROM agents WHERE id=? AND company_id=?').get(p.id, company));
    if (!ag || (t.agent_id && t.agent_id !== p.id)) fail('TAREFA_DE_OUTRO_AGENTE', 'Agente só atualiza tarefas atribuídas a ele', 403);
  }
  await tx(db, async () => {
    if (to && to !== t.status) {
      if (to === 'EM_ANDAMENTO') {
        const open = [];
        for (const dep of J(t.depends_on)) if ((await db.prepare('SELECT status FROM tasks WHERE id=?').get(dep))?.status !== 'CONCLUIDA') open.push(dep);
        if (open.length) fail('DEPENDENCIAS_PENDENTES', `Dependências não concluídas: ${open.join(', ')}`, 409);
        (await db.prepare('UPDATE tasks SET attempts=attempts+1 WHERE id=?').run(id));
      }
      if (to === 'CONCLUIDA') {
        const ev = [...J(t.evidence), ...(d.evidence ? [d.evidence] : [])];
        if (!ev.length) fail('EVIDENCIA_OBRIGATORIA', 'Conclusão exige evidência de entrega (ex.: link do Drive)');
      }
      if (to === 'FALHA' && !d.error) fail('MOTIVO_OBRIGATORIO', 'FALHA exige descrição do erro');
      (await db.prepare('UPDATE tasks SET status=? WHERE id=?').run(to, id));
    }
    if (d.evidence) (await db.prepare('UPDATE tasks SET evidence=? WHERE id=?').run(JSON.stringify([...J(t.evidence), { ...d.evidence, at: now(), by: `${p.kind}:${p.id}` }]), id));
    if (d.error) (await db.prepare('UPDATE tasks SET errors=? WHERE id=?').run(JSON.stringify([...J(t.errors), { message: d.error, at: now(), by: `${p.kind}:${p.id}` }]), id));
    if (d.cost_brl != null) (await db.prepare('UPDATE tasks SET cost_brl=? WHERE id=?').run(d.cost_brl, id));
    (await db.prepare('UPDATE tasks SET updated_at=? WHERE id=?').run(now(), id));
    if (t.agent_id) (await db.prepare('UPDATE agents SET last_activity_at=?, last_run_summary=? WHERE id=?').run(now(), `${t.title}: ${to ?? 'atualizada'}`, t.agent_id));
    (await audit(db, company, 'task', id, to ?? 'ATUALIZADA', p, d));
  });
}
