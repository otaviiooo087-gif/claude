import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Toda tabela de negócio carrega company_id; consultas sempre filtram por ele.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin')), token_hash TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS user_companies(user_id TEXT NOT NULL, company_id TEXT NOT NULL, PRIMARY KEY(user_id, company_id));
CREATE TABLE IF NOT EXISTS agents(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]', integration TEXT, config TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'NAO_VERIFICADO', last_activity_at TEXT, last_run_summary TEXT,
  token_hash TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS accounts(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, channel TEXT NOT NULL, label TEXT NOT NULL,
  provider TEXT, external_ref TEXT, status TEXT NOT NULL DEFAULT 'NAO_VERIFICADA',
  verified_at TEXT, verified_by TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS contents(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL,
  service TEXT, objective TEXT, audience TEXT, owner TEXT, origin_ref TEXT,
  current_version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, created_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content_versions(
  content_id TEXT NOT NULL, version INTEGER NOT NULL, company_id TEXT NOT NULL,
  brief TEXT, text TEXT, text_sha256 TEXT, declared_sha256 TEXT, channels TEXT NOT NULL DEFAULT '[]',
  planned_for TEXT, reason TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  PRIMARY KEY(content_id, version));
CREATE TABLE IF NOT EXISTS files(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, content_id TEXT NOT NULL, version INTEGER NOT NULL,
  kind TEXT NOT NULL, channel TEXT, name TEXT NOT NULL, drive_id TEXT, drive_url TEXT,
  size INTEGER, mime TEXT, fingerprint TEXT, status TEXT NOT NULL DEFAULT 'ATIVO',
  verification_level TEXT NOT NULL DEFAULT 'NAO_CONFERIDO', verified_by TEXT, verified_at TEXT, verification_note TEXT,
  created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS targets(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, content_id TEXT NOT NULL, version INTEGER NOT NULL,
  channel TEXT NOT NULL, account_id TEXT, destination TEXT, audience TEXT,
  window_start TEXT, window_end TEXT, file_ids TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'ATIVO');
CREATE TABLE IF NOT EXISTS approvals(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, content_id TEXT NOT NULL, version INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('CRIACAO','DISTRIBUICAO')),
  decision TEXT NOT NULL CHECK(decision IN ('APROVADO','AJUSTE_SOLICITADO','REPROVADO')),
  scope_json TEXT NOT NULL, scope_hash TEXT NOT NULL, target_ids TEXT NOT NULL DEFAULT '[]',
  comment TEXT, flags TEXT NOT NULL DEFAULT '[]', decided_by TEXT NOT NULL, decided_at TEXT NOT NULL,
  invalidated_at TEXT, invalidated_reason TEXT);
CREATE TABLE IF NOT EXISTS publications(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, content_id TEXT NOT NULL, version INTEGER NOT NULL,
  target_id TEXT NOT NULL, approval_id TEXT NOT NULL, channel TEXT NOT NULL, account_id TEXT NOT NULL,
  provider TEXT NOT NULL, simulated INTEGER NOT NULL DEFAULT 0, scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('AGENDADO','EM_PUBLICACAO','PUBLICADO','FALHA','RESULTADO_INCERTO')),
  provider_ref TEXT, public_url TEXT, result_json TEXT, last_error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  external_cancel_pending INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, content_id TEXT, agent_id TEXT, title TEXT NOT NULL,
  input TEXT, expected_output TEXT, completion_criteria TEXT, owner TEXT, depends_on TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'MEDIA', due_at TEXT, status TEXT NOT NULL DEFAULT 'PENDENTE',
  attempts INTEGER NOT NULL DEFAULT 0, errors TEXT NOT NULL DEFAULT '[]', evidence TEXT NOT NULL DEFAULT '[]',
  cost_brl REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS integrations(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
  detail TEXT, checked_at TEXT, checked_by TEXT);
CREATE TABLE IF NOT EXISTS market_sources(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL,
  drive_id TEXT, drive_url TEXT, last_import_at TEXT, rows_imported INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS market_items(
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, nature TEXT NOT NULL,
  natural_key TEXT NOT NULL, title TEXT NOT NULL, source TEXT, url TEXT, published_at TEXT, collected_at TEXT,
  relevance REAL, data TEXT NOT NULL DEFAULT '{}', source_id TEXT, imported_at TEXT NOT NULL,
  UNIQUE(company_id, kind, natural_key));
CREATE TABLE IF NOT EXISTS audit_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, details TEXT);
CREATE INDEX IF NOT EXISTS ix_audit ON audit_log(company_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS ix_pub ON publications(company_id, status, scheduled_for);
`;

export function openDb(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec(SCHEMA);
  return db;
}

const depth = new WeakMap();
// Transação reentrante: níveis internos usam SAVEPOINT.
export const tx = (db, fn) => {
  const d = depth.get(db) ?? 0; const sp = `sp${d}`;
  db.exec(d === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`); depth.set(db, d + 1);
  try { const r = fn(); db.exec(d === 0 ? 'COMMIT' : `RELEASE ${sp}`); return r; }
  catch (e) { db.exec(d === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`); throw e; }
  finally { depth.set(db, d); }
};
