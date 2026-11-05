const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

function abrir(arquivo) {
  if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY, nome TEXT NOT NULL, criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL DEFAULT 'admin', criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      expira_em INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      nome TEXT NOT NULL, cpf TEXT, telefone TEXT, email TEXT, origem TEXT,
      etapa TEXT NOT NULL DEFAULT 'lead', valor_servico REAL NOT NULL DEFAULT 0,
      consentimento_lgpd INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS dividas (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      credor TEXT NOT NULL, valor REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'negativado'
    );
    CREATE TABLE IF NOT EXISTS parcelas (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      numero INTEGER NOT NULL, valor REAL NOT NULL, vencimento TEXT NOT NULL, pago INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL, vencimento TEXT, feito INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY, empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      texto TEXT NOT NULL, criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS i_clientes_emp ON clientes(empresa_id);
    CREATE INDEX IF NOT EXISTS i_parcelas_emp ON parcelas(empresa_id, vencimento);
    CREATE INDEX IF NOT EXISTS i_tarefas_emp ON tarefas(empresa_id, feito);
  `);
  return db;
}
module.exports = { abrir };
