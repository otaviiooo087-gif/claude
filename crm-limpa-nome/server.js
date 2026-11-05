const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { abrir } = require('./db');

const ETAPAS = ['lead', 'consulta', 'proposta', 'contrato', 'pago', 'andamento', 'limpo', 'posvenda', 'perdido'];
const STATUS_DIVIDA = ['negativado', 'negociado', 'quitado'];
const SESSAO_MS = 1000 * 60 * 60 * 24 * 14;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

class Erro extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

function hashSenha(senha, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(senha, salt, 64).toString('hex')}`;
}
function confereSenha(senha, guardado) {
  const [salt, hash] = guardado.split(':');
  const novo = crypto.scryptSync(senha, salt, 64);
  const velho = Buffer.from(hash, 'hex');
  return velho.length === novo.length && crypto.timingSafeEqual(velho, novo);
}

function cpfValido(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

const texto = (v, max = 200) => (v == null ? '' : String(v).trim().slice(0, max));
const numero = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const bool = (v) => (v ? 1 : 0);

function criarApp({ arquivoDb = path.join(__dirname, 'data', 'crm.db') } = {}) {
  const db = abrir(arquivoDb);
  const limiteLogin = new Map();

  const um = (sql, ...p) => db.prepare(sql).get(...p);
  const todos = (sql, ...p) => db.prepare(sql).all(...p);
  const exec = (sql, ...p) => db.prepare(sql).run(...p);

  function criarSessao(usuarioId, res) {
    const token = crypto.randomBytes(32).toString('hex');
    exec('INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?,?,?)', token, usuarioId, Date.now() + SESSAO_MS);
    res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSAO_MS / 1000}`);
  }

  function usuarioDaRequisicao(req) {
    const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
    if (!m) return null;
    const s = um('SELECT u.id, u.empresa_id, u.nome, u.email, u.papel, s.expira_em FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ?', m[1]);
    if (!s) return null;
    if (s.expira_em < Date.now()) { exec('DELETE FROM sessoes WHERE token = ?', m[1]); return null; }
    return s;
  }

  function lerCorpo(req) {
    return new Promise((resolve, reject) => {
      let buf = '';
      req.on('data', (c) => { buf += c; if (buf.length > 1e6) { reject(new Erro(413, 'Corpo grande demais')); req.destroy(); } });
      req.on('end', () => {
        if (!buf) return resolve({});
        try { resolve(JSON.parse(buf)); } catch { reject(new Erro(400, 'JSON inválido')); }
      });
    });
  }

  // Busca sempre filtrando por empresa: é isso que isola os dados de cada cliente do SaaS.
  function doCliente(u, id) {
    const c = um('SELECT * FROM clientes WHERE id = ? AND empresa_id = ?', id, u.empresa_id);
    if (!c) throw new Erro(404, 'Cliente não encontrado');
    return c;
  }

  function validarCliente(b, parcial = false) {
    const out = {};
    if (!parcial || 'nome' in b) {
      out.nome = texto(b.nome, 120);
      if (!out.nome) throw new Erro(400, 'Nome é obrigatório');
    }
    if ('cpf' in b) {
      const cpf = String(b.cpf || '').replace(/\D/g, '');
      if (cpf && !cpfValido(cpf)) throw new Erro(400, 'CPF inválido');
      out.cpf = cpf;
    }
    for (const k of ['telefone', 'email', 'origem']) if (k in b) out[k] = texto(b[k], 120);
    if ('etapa' in b) {
      if (!ETAPAS.includes(b.etapa)) throw new Erro(400, 'Etapa inválida');
      out.etapa = b.etapa;
    }
    if ('valor_servico' in b) out.valor_servico = numero(b.valor_servico);
    if ('consentimento_lgpd' in b) out.consentimento_lgpd = bool(b.consentimento_lgpd);
    return out;
  }

  const rotas = [];
  const rota = (metodo, padrao, publica, fn) => {
    const chaves = [];
    const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, k) => { chaves.push(k); return '(\\d+)'; }) + '$');
    rotas.push({ metodo, re, chaves, publica, fn });
  };

  // ---------- autenticação ----------
  rota('POST', '/api/registrar', true, async ({ body, res }) => {
    const empresa = texto(body.empresa, 120), nome = texto(body.nome, 120);
    const email = texto(body.email, 160).toLowerCase(), senha = String(body.senha || '');
    if (!empresa || !nome) throw new Erro(400, 'Preencha empresa e nome');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Erro(400, 'E-mail inválido');
    if (senha.length < 8) throw new Erro(400, 'A senha precisa ter pelo menos 8 caracteres');
    if (um('SELECT 1 FROM usuarios WHERE email = ?', email)) throw new Erro(409, 'E-mail já cadastrado');
    const e = exec('INSERT INTO empresas (nome) VALUES (?)', empresa);
    const u = exec('INSERT INTO usuarios (empresa_id, nome, email, senha_hash, papel) VALUES (?,?,?,?,?)',
      e.lastInsertRowid, nome, email, hashSenha(senha), 'admin');
    criarSessao(u.lastInsertRowid, res);
    return { status: 201, data: { ok: true } };
  });

  rota('POST', '/api/login', true, async ({ body, req, res }) => {
    const email = texto(body.email, 160).toLowerCase();
    const chave = `${req.socket.remoteAddress}|${email}`;
    const t = limiteLogin.get(chave) || { n: 0, ate: 0 };
    if (t.n >= 5 && Date.now() < t.ate) throw new Erro(429, 'Muitas tentativas. Aguarde alguns minutos.');
    const u = um('SELECT * FROM usuarios WHERE email = ?', email);
    if (!u || !confereSenha(String(body.senha || ''), u.senha_hash)) {
      limiteLogin.set(chave, { n: t.n + 1, ate: Date.now() + 5 * 60 * 1000 });
      throw new Erro(401, 'E-mail ou senha incorretos');
    }
    limiteLogin.delete(chave);
    criarSessao(u.id, res);
    return { data: { ok: true } };
  });

  rota('POST', '/api/logout', false, async ({ req, res }) => {
    const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
    if (m) exec('DELETE FROM sessoes WHERE token = ?', m[1]);
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return { data: { ok: true } };
  });

  rota('GET', '/api/me', false, async ({ u }) => ({
    data: { nome: u.nome, email: u.email, papel: u.papel, empresa: um('SELECT nome FROM empresas WHERE id = ?', u.empresa_id).nome, etapas: ETAPAS },
  }));

  // ---------- clientes ----------
  rota('GET', '/api/clientes', false, async ({ u, query }) => {
    const q = `%${texto(query.get('q'), 80)}%`;
    return { data: todos(
      `SELECT c.*, (SELECT COALESCE(SUM(valor),0) FROM dividas d WHERE d.cliente_id = c.id AND d.empresa_id = c.empresa_id) AS total_dividas
       FROM clientes c WHERE c.empresa_id = ? AND (c.nome LIKE ? OR c.cpf LIKE ? OR c.telefone LIKE ?) ORDER BY c.id DESC`,
      u.empresa_id, q, q, q) };
  });

  rota('POST', '/api/clientes', false, async ({ u, body }) => {
    const c = validarCliente(body);
    const r = exec(`INSERT INTO clientes (empresa_id, nome, cpf, telefone, email, origem, etapa, valor_servico, consentimento_lgpd)
      VALUES (?,?,?,?,?,?,?,?,?)`, u.empresa_id, c.nome, c.cpf || '', c.telefone || '', c.email || '', c.origem || '',
      c.etapa || 'lead', c.valor_servico || 0, c.consentimento_lgpd || 0);
    return { status: 201, data: doCliente(u, r.lastInsertRowid) };
  });

  rota('GET', '/api/clientes/:id', false, async ({ u, params }) => {
    const c = doCliente(u, params.id);
    const w = [c.id, u.empresa_id];
    return { data: {
      ...c,
      dividas: todos('SELECT * FROM dividas WHERE cliente_id = ? AND empresa_id = ? ORDER BY id', ...w),
      parcelas: todos('SELECT * FROM parcelas WHERE cliente_id = ? AND empresa_id = ? ORDER BY numero', ...w),
      notas: todos('SELECT * FROM notas WHERE cliente_id = ? AND empresa_id = ? ORDER BY id DESC', ...w),
      tarefas: todos('SELECT * FROM tarefas WHERE cliente_id = ? AND empresa_id = ? ORDER BY feito, vencimento', ...w),
    } };
  });

  rota('PATCH', '/api/clientes/:id', false, async ({ u, params, body }) => {
    doCliente(u, params.id);
    const c = validarCliente(body, true);
    const campos = Object.keys(c);
    if (campos.length) {
      exec(`UPDATE clientes SET ${campos.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND empresa_id = ?`,
        ...campos.map((k) => c[k]), params.id, u.empresa_id);
    }
    return { data: doCliente(u, params.id) };
  });

  rota('DELETE', '/api/clientes/:id', false, async ({ u, params }) => {
    doCliente(u, params.id);
    exec('DELETE FROM clientes WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  // ---------- dívidas ----------
  rota('POST', '/api/clientes/:id/dividas', false, async ({ u, params, body }) => {
    doCliente(u, params.id);
    const credor = texto(body.credor, 120);
    if (!credor) throw new Erro(400, 'Informe o credor');
    const status = body.status || 'negativado';
    if (!STATUS_DIVIDA.includes(status)) throw new Erro(400, 'Status inválido');
    const r = exec('INSERT INTO dividas (empresa_id, cliente_id, credor, valor, status) VALUES (?,?,?,?,?)',
      u.empresa_id, params.id, credor, numero(body.valor), status);
    return { status: 201, data: um('SELECT * FROM dividas WHERE id = ?', r.lastInsertRowid) };
  });

  rota('PATCH', '/api/dividas/:id', false, async ({ u, params, body }) => {
    if (!um('SELECT 1 FROM dividas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id)) throw new Erro(404, 'Dívida não encontrada');
    if (!STATUS_DIVIDA.includes(body.status)) throw new Erro(400, 'Status inválido');
    exec('UPDATE dividas SET status = ? WHERE id = ? AND empresa_id = ?', body.status, params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  rota('DELETE', '/api/dividas/:id', false, async ({ u, params }) => {
    exec('DELETE FROM dividas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  // ---------- parcelas ----------
  rota('POST', '/api/clientes/:id/parcelas', false, async ({ u, params, body }) => {
    doCliente(u, params.id);
    const qtd = Math.floor(Number(body.quantidade));
    const total = numero(body.total);
    const inicio = /^\d{4}-\d{2}-\d{2}$/.test(body.primeiro_vencimento || '') ? body.primeiro_vencimento : null;
    if (!(qtd >= 1 && qtd <= 60) || total <= 0 || !inicio) throw new Erro(400, 'Informe quantidade (1 a 60), total e primeiro vencimento');
    const centavos = Math.round(total * 100);
    const base = Math.floor(centavos / qtd), resto = centavos - base * qtd;
    const atual = um('SELECT COALESCE(MAX(numero),0) AS m FROM parcelas WHERE cliente_id = ? AND empresa_id = ?', params.id, u.empresa_id).m;
    const [a, m, d] = inicio.split('-').map(Number);
    for (let i = 0; i < qtd; i++) {
      const dt = new Date(Date.UTC(a, m - 1 + i, d));
      // dia 31 em mês curto: usa o último dia do mês em vez de rolar para o mês seguinte
      if (dt.getUTCDate() !== d) dt.setUTCDate(0);
      exec('INSERT INTO parcelas (empresa_id, cliente_id, numero, valor, vencimento) VALUES (?,?,?,?,?)',
        u.empresa_id, params.id, atual + i + 1, (base + (i < resto ? 1 : 0)) / 100, dt.toISOString().slice(0, 10));
    }
    return { status: 201, data: { ok: true } };
  });

  rota('PATCH', '/api/parcelas/:id', false, async ({ u, params, body }) => {
    if (!um('SELECT 1 FROM parcelas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id)) throw new Erro(404, 'Parcela não encontrada');
    exec('UPDATE parcelas SET pago = ? WHERE id = ? AND empresa_id = ?', bool(body.pago), params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  rota('DELETE', '/api/parcelas/:id', false, async ({ u, params }) => {
    exec('DELETE FROM parcelas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  // ---------- notas ----------
  rota('POST', '/api/clientes/:id/notas', false, async ({ u, params, body }) => {
    doCliente(u, params.id);
    const t = texto(body.texto, 2000);
    if (!t) throw new Erro(400, 'Nota vazia');
    const r = exec('INSERT INTO notas (empresa_id, cliente_id, texto) VALUES (?,?,?)', u.empresa_id, params.id, t);
    return { status: 201, data: um('SELECT * FROM notas WHERE id = ?', r.lastInsertRowid) };
  });

  // ---------- tarefas ----------
  rota('GET', '/api/tarefas', false, async ({ u }) => ({
    data: todos(`SELECT t.*, c.nome AS cliente_nome FROM tarefas t LEFT JOIN clientes c ON c.id = t.cliente_id
      WHERE t.empresa_id = ? ORDER BY t.feito, t.vencimento IS NULL, t.vencimento`, u.empresa_id),
  }));

  rota('POST', '/api/tarefas', false, async ({ u, body }) => {
    const titulo = texto(body.titulo, 200);
    if (!titulo) throw new Erro(400, 'Informe o título');
    let clienteId = null;
    if (body.cliente_id) clienteId = doCliente(u, Number(body.cliente_id)).id;
    const venc = /^\d{4}-\d{2}-\d{2}$/.test(body.vencimento || '') ? body.vencimento : null;
    const r = exec('INSERT INTO tarefas (empresa_id, cliente_id, titulo, vencimento) VALUES (?,?,?,?)', u.empresa_id, clienteId, titulo, venc);
    return { status: 201, data: um('SELECT * FROM tarefas WHERE id = ?', r.lastInsertRowid) };
  });

  rota('PATCH', '/api/tarefas/:id', false, async ({ u, params, body }) => {
    if (!um('SELECT 1 FROM tarefas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id)) throw new Erro(404, 'Tarefa não encontrada');
    exec('UPDATE tarefas SET feito = ? WHERE id = ? AND empresa_id = ?', bool(body.feito), params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  rota('DELETE', '/api/tarefas/:id', false, async ({ u, params }) => {
    exec('DELETE FROM tarefas WHERE id = ? AND empresa_id = ?', params.id, u.empresa_id);
    return { data: { ok: true } };
  });

  // ---------- dashboard ----------
  rota('GET', '/api/dashboard', false, async ({ u }) => {
    const e = u.empresa_id;
    const hoje = new Date().toISOString().slice(0, 10);
    const porEtapa = Object.fromEntries(ETAPAS.map((x) => [x, 0]));
    for (const r of todos('SELECT etapa, COUNT(*) n FROM clientes WHERE empresa_id = ? GROUP BY etapa', e)) porEtapa[r.etapa] = r.n;
    const total = Object.values(porEtapa).reduce((a, b) => a + b, 0);
    const fechados = porEtapa.pago + porEtapa.andamento + porEtapa.limpo + porEtapa.posvenda;
    return { data: {
      clientes: total,
      por_etapa: porEtapa,
      conversao: total ? Math.round((fechados / total) * 100) : 0,
      recebido: um('SELECT COALESCE(SUM(valor),0) v FROM parcelas WHERE empresa_id = ? AND pago = 1', e).v,
      a_receber: um('SELECT COALESCE(SUM(valor),0) v FROM parcelas WHERE empresa_id = ? AND pago = 0', e).v,
      em_atraso: um('SELECT COALESCE(SUM(valor),0) v, COUNT(*) n FROM parcelas WHERE empresa_id = ? AND pago = 0 AND vencimento < ?', e, hoje),
      tarefas_hoje: um('SELECT COUNT(*) n FROM tarefas WHERE empresa_id = ? AND feito = 0 AND vencimento IS NOT NULL AND vencimento <= ?', e, hoje).n,
      origens: todos("SELECT COALESCE(NULLIF(origem,''),'Sem origem') AS origem, COUNT(*) n FROM clientes WHERE empresa_id = ? GROUP BY 1 ORDER BY n DESC LIMIT 8", e),
    } };
  });

  // ---------- servidor ----------
  async function tratar(req, res) {
    const url = new URL(req.url, 'http://x');
    const enviar = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };

    if (url.pathname.startsWith('/api/')) {
      try {
        // Defesa CSRF: requisições que mudam dados só valem se vierem do mesmo site.
        if (req.method !== 'GET') {
          const origem = req.headers.origin;
          if (origem && new URL(origem).host !== req.headers.host) throw new Erro(403, 'Origem não permitida');
        }
        for (const r of rotas) {
          if (r.metodo !== req.method) continue;
          const m = r.re.exec(url.pathname);
          if (!m) continue;
          const params = Object.fromEntries(r.chaves.map((k, i) => [k, Number(m[i + 1])]));
          let u = null;
          if (!r.publica) {
            u = usuarioDaRequisicao(req);
            if (!u) throw new Erro(401, 'Não autenticado');
          }
          const body = ['POST', 'PATCH'].includes(req.method) ? await lerCorpo(req) : {};
          const out = await r.fn({ req, res, u, params, body, query: url.searchParams });
          return enviar(out.status || 200, out.data);
        }
        throw new Erro(404, 'Rota não encontrada');
      } catch (err) {
        if (err instanceof Erro) return enviar(err.status, { erro: err.message });
        console.error(err);
        return enviar(500, { erro: 'Erro interno' });
      }
    }

    // arquivos estáticos
    const nome = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const arquivo = path.join(__dirname, 'public', path.normalize(nome));
    if (!arquivo.startsWith(path.join(__dirname, 'public') + path.sep) || !MIME[path.extname(arquivo)] || !fs.existsSync(arquivo)) {
      res.writeHead(404); return res.end('Não encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)], 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    fs.createReadStream(arquivo).pipe(res);
  }

  const server = http.createServer((req, res) => { tratar(req, res).catch((e) => { console.error(e); res.writeHead(500); res.end(); }); });
  return { server, db };
}

if (require.main === module) {
  const porta = Number(process.env.PORT) || 3000;
  criarApp().server.listen(porta, () => console.log(`CRM rodando em http://localhost:${porta}`));
}

module.exports = { criarApp, cpfValido, ETAPAS };
