import { randomUUID } from 'node:crypto';
import { audit } from './domain.js';
import { tx } from './db.js';

// Parser CSV (RFC 4180): aspas, vírgulas e quebras de linha dentro de campos; remove BOM.
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); if (row.some((x) => x !== '')) rows.push(row); }
  if (!rows.length) return [];
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const num = (x) => { if (x == null || x === '') return null; const n = Number(String(x).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const normUrl = (u) => { try { const x = new URL(u); x.hash = ''; x.search = ''; return (x.host + x.pathname).replace(/\/+$/, '').toLowerCase(); } catch { return (u ?? '').trim().toLowerCase(); } };
const normText = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Cada mapper devolve { natural_key, title, nature, source, url, published_at, collected_at, relevance, data }.
export const MAPPERS = {
  noticia: (r) => ({
    natural_key: normUrl(r.url) || r.id, title: r.titulo, nature: 'FATO', source: r.fonte, url: r.url,
    published_at: r.data_publicacao || null, collected_at: r.coletado_em || null, relevance: null,
    data: { id_planilha: r.id, tipo_fonte: r.tipo_fonte, confiabilidade_1a5: num(r.confiabilidade_1a5), data_do_fato: r.data_do_fato || null,
      temas: r.temas, publico: r.publico, resumo: r.resumo, numeros: r.numeros, flags: r.flags },
  }),
  concorrente: (r) => ({
    natural_key: normText(r.perfil), title: `@${r.perfil}`, nature: 'FATO', source: 'Instagram (posts públicos)', url: r.instagram,
    published_at: r.ultimo_post || null, collected_at: (r.coletado_em || '').slice(0, 10) || null, relevance: null,
    data: { categoria: r.categoria, seguidores: num(r.seguidores), posicionamento: r.posicionamento, servicos: r.servicos, ctas: r.ctas, frequencia: r.frequencia,
      formatos: r.formatos, interpretacao: r.observacoes || null, status: r.status },
  }),
  post: (r) => ({
    natural_key: normUrl(r.url), title: `${r.perfil} · ${r.formato} · ${r.tema || 'sem tema'}`, nature: 'FATO', source: r.perfil, url: r.url,
    published_at: r.data_publicacao || null, collected_at: r.coletado_em || null, relevance: num(r.desempenho_relativo_x),
    data: { perfil: r.perfil, formato: r.formato, curtidas: num(r.curtidas), comentarios: num(r.comentarios), views: num(r.views), seguidores: num(r.seguidores),
      outlier: r.outlier, base_comparacao: r.base_comparacao, interpretacao: r.outlier === 'sim' ? 'Marcado como outlier pelo agente coletor' : null },
  }),
  pauta: (r) => ({
    natural_key: normText(`${r.tema}|${r.publico}|${r.formato}`), title: r.tema, nature: 'SUGESTAO', source: r.origem, url: (r.referencias || '').split(';')[0].trim() || null,
    published_at: null, collected_at: null, relevance: num(r.indice_0a100),
    data: { dia: r.dia, publico: r.publico, formato: r.formato, objetivo: r.objetivo, gancho: r.gancho, cta: r.cta, classe: r.classe, confianca: r.confianca,
      cuidado: r.cuidado, referencias: r.referencias, status_planilha: r.status, aviso: 'Sugestão: não autoriza produção nem publicação' },
  }),
};

// Importa linhas já parseadas, deduplicando por (empresa, tipo, chave natural). Reimportar é idempotente.
export async function importRows(db, p, company, kind, rows, source = {}) {
  const map = MAPPERS[kind]; if (!map) throw new Error(`Tipo desconhecido: ${kind}`);
  let inserted = 0; let merged = 0; let skipped = 0;
  await tx(db, async () => {
    for (const r of rows) {
      const m = map(r);
      if (!m.natural_key || !m.title) { skipped++; continue; }
      const ex = await db.prepare('SELECT id,data FROM market_items WHERE company_id=? AND kind=? AND natural_key=?').get(company, kind, m.natural_key);
      const origin = r.origem || source.name || null;
      if (ex) {
        const d = JSON.parse(ex.data); const seen = new Set(d.vista_em ?? []); if (origin) seen.add(origin);
        d.vista_em = [...seen];
        await db.prepare('UPDATE market_items SET data=? WHERE id=?').run(JSON.stringify(d), ex.id); merged++;
      } else {
        m.data.vista_em = origin ? [origin] : [];
        await db.prepare(`INSERT INTO market_items(id,company_id,kind,nature,natural_key,title,source,url,published_at,collected_at,relevance,data,source_id,imported_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(`mi_${randomUUID().slice(0, 8)}`, company, kind, m.nature, m.natural_key, m.title, m.source ?? null, m.url ?? null, m.published_at, m.collected_at,
          m.relevance, JSON.stringify(m.data), source.id ?? null, new Date().toISOString()); inserted++;
      }
    }
    if (source.id) await db.prepare('UPDATE market_sources SET last_import_at=?, rows_imported=(SELECT COUNT(*) FROM market_items WHERE source_id=?) WHERE id=?')
      .run(new Date().toISOString(), source.id, source.id);
    await audit(db, company, 'market_source', source.id ?? kind, 'IMPORTADO', p, { kind, inserted, merged, skipped });
  });
  return { inserted, merged, skipped };
}
