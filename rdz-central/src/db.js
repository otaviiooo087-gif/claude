import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

pg.types.setTypeParser(20, Number); // BIGINT/COUNT(*) como número

const MIGRATION = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '001_schema.sql'), 'utf8');
const als = new AsyncLocalStorage(); // cliente da transação corrente

// Converte "?" em "$n" (nenhum SQL desta aplicação usa "?" literal).
const toPg = (sql) => { let n = 0; return sql.replace(/\?/g, () => `$${++n}`); };

class Db {
  constructor(backend, close) { this.b = backend; this._close = close; this.chain = Promise.resolve(); this.depth = new WeakMap(); }
  // backend.query(sql, params) -> rows ; backend.exec(sql)
  async _run(sql, params = []) {
    const store = als.getStore();
    if (store && store.db === this) return store.q(sql, params);
    if (this.b.serialize) { // PGlite: conexão única, serializa instruções avulsas
      const prev = this.chain; let done; this.chain = new Promise((r) => (done = r));
      await prev; try { return await this.b.query(sql, params); } finally { done(); }
    }
    return this.b.query(sql, params);
  }
  prepare(sql) {
    const q = toPg(sql);
    return {
      get: async (...p) => (await this._run(q, p))[0],
      all: async (...p) => this._run(q, p),
      run: async (...p) => ({ changes: (await this._run(q, p)).count ?? 0 }),
    };
  }
  async exec(sql) { await this._run(sql, []); }
  async tx(fn) {
    const outer = als.getStore();
    if (outer && outer.db === this) { // aninhada: SAVEPOINT
      const sp = `sp${++outer.n}`; await outer.q(`SAVEPOINT ${sp}`, []);
      try { const r = await fn(); await outer.q(`RELEASE ${sp}`, []); return r; }
      catch (e) { await outer.q(`ROLLBACK TO ${sp}`, []); await outer.q(`RELEASE ${sp}`, []); throw e; }
    }
    return this.b.transaction(async (q) => als.run({ db: this, q, n: 0 }, fn));
  }
  async close() { await this._close?.(); }
}

async function migrate(db) { await db.b.exec(MIGRATION); }

// url: "postgresql://..." (Supabase) | "pglite:memory" | "pglite:<diretório>"
export async function openDb(url = process.env.DATABASE_URL || 'pglite:memory') {
  let db;
  if (url.startsWith('pglite:')) {
    const where = url.slice(7);
    if (where !== 'memory') mkdirSync(where, { recursive: true });
    const lite = new PGlite(where === 'memory' ? undefined : where);
    await lite.waitReady;
    db = new Db({
      serialize: true,
      query: async (sql, params) => { const r = await lite.query(sql, params); const rows = r.rows; rows.count = r.affectedRows ?? rows.length; return rows; },
      exec: (sql) => lite.exec(sql),
      transaction: async (fn) => { // uma transação por vez; instruções avulsas esperam na fila
        const prev = db.chain; let done; db.chain = new Promise((r) => (done = r)); await prev;
        try {
          await lite.exec('BEGIN');
          const q = async (sql, params) => { const r = await lite.query(sql, params); const rows = r.rows; rows.count = r.affectedRows ?? rows.length; return rows; };
          try { const r = await fn(q); await lite.exec('COMMIT'); return r; } catch (e) { await lite.exec('ROLLBACK'); throw e; }
        } finally { done(); }
      },
    }, () => lite.close());
  } else {
    const pool = new pg.Pool({ connectionString: url, max: 5, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
    const wrap = (c) => async (sql, params) => { const r = await c.query(sql, params); r.rows.count = r.rowCount; return r.rows; };
    db = new Db({
      query: wrap(pool), exec: (sql) => pool.query(sql),
      transaction: async (fn) => { const c = await pool.connect(); try { await c.query('BEGIN'); const r = await fn(wrap(c)); await c.query('COMMIT'); return r; } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); } },
    }, () => pool.end());
  }
  await migrate(db);
  return db;
}

export const tx = (db, fn) => db.tx(fn);
