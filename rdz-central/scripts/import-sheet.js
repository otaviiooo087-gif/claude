// Uso: npm run import-sheet -- <noticia|concorrente|post|pauta> <arquivo.csv> [sourceId] [empresa]
// O CSV deve ser a exportação da planilha do Drive (Arquivo > Fazer download > CSV).
import { readFileSync } from 'node:fs';
import { openDb } from '../src/db.js';
import { parseCsv, importRows } from '../src/importers.js';
const [kind, file, sourceId, company = 'rdz'] = process.argv.slice(2);
if (!kind || !file) { console.error('uso: import-sheet <noticia|concorrente|post|pauta> <arquivo.csv> [sourceId] [empresa]'); process.exit(1); }
const db = openDb(process.env.RDZ_DB || 'data/rdz.sqlite');
const src = sourceId ? db.prepare('SELECT * FROM market_sources WHERE id=? AND company_id=?').get(sourceId, company) : null;
if (sourceId && !src) { console.error(`fonte ${sourceId} não registrada`); process.exit(1); }
console.log(importRows(db, { kind: 'admin', id: 'cli' }, company, kind, parseCsv(readFileSync(file, 'utf8')), src ?? {}));
