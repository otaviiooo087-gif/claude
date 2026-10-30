// Uso: npm run import-sheet -- <noticia|concorrente|post|pauta> <arquivo.csv> [sourceId] [empresa]
// O CSV deve ser a exportação da planilha do Drive (Arquivo > Fazer download > CSV).
import { readFileSync } from 'node:fs';
import { openDb } from '../src/db.js';
import { parseCsv, importRows } from '../src/importers.js';
const [kind, file, sourceId, company = 'rdz'] = process.argv.slice(2);
if (!kind || !file) { console.error('uso: import-sheet <noticia|concorrente|post|pauta> <arquivo.csv> [sourceId] [empresa]'); process.exit(1); }
const db = await openDb(process.env.DATABASE_URL || 'pglite:data/pglite');
const src = sourceId ? await db.prepare('SELECT * FROM market_sources WHERE id=? AND company_id=?').get(sourceId, company) : null;
if (sourceId && !src) { console.error(`fonte ${sourceId} não registrada`); process.exit(1); }
console.log(await importRows(db, { kind: 'admin', id: 'cli' }, company, kind, parseCsv(readFileSync(file, 'utf8')), src ?? {}));
await db.close();
