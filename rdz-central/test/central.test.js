import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import * as D from '../src/domain.js';
import { seedRdz } from '../seed/seed.js';
import { parseCsv, importRows } from '../src/importers.js';

const admin = { kind: 'admin', id: 'a', name: 'Admin', companies: ['rdz'] };
const agent = { kind: 'agent', id: 'rdz-claude-tec', name: 'Claude', companies: ['rdz'] };
const fresh = () => { const db = openDb(); seedRdz(db, { adminToken: 'x' }); return db; };
const code = (fn) => { try { fn(); } catch (e) { return e.code; } return 'NAO_FALHOU'; };
const tgt = (db, id) => db.prepare("SELECT id FROM targets WHERE content_id=?").get(id).id;
const WIN = '2026-10-31T13:00:00.000Z';

function approveAll(db, id = 'RDZ_VIDEO_003') {
  D.decide(db, admin, 'rdz', { content_id: id, version: 1, stage: 'CRIACAO', decision: 'APROVADO' });
  return D.decide(db, admin, 'rdz', { content_id: id, version: 1, stage: 'DISTRIBUICAO', decision: 'APROVADO', target_ids: [tgt(db, id)] });
}

test('seed: nada nasce aprovado, publicado ou agendado', () => {
  const db = fresh();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM approvals').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM publications').get().n, 0);
  const c = db.prepare("SELECT * FROM contents WHERE id='RDZ_VIDEO_003'").get();
  assert.equal(D.contentStatus(db, 'rdz', c), 'AGUARDANDO_AUTORIZACAO_CRIACAO');
});

test('agente não aprova', () => {
  const db = fresh();
  assert.equal(code(() => D.decide(db, agent, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'APROVADO' })), 'SOMENTE_ADMIN');
});

test('distribuição exige criação autorizada e destinos explícitos', () => {
  const db = fresh();
  assert.equal(code(() => D.decide(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'DISTRIBUICAO', decision: 'APROVADO', target_ids: [tgt(db, 'RDZ_VIDEO_003')] })), 'CRIACAO_NAO_AUTORIZADA');
  D.decide(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'APROVADO' });
  assert.equal(code(() => D.decide(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'DISTRIBUICAO', decision: 'APROVADO' })), 'DESTINOS_NAO_INFORMADOS');
});

test('ajuste/reprovação exigem comentário', () => {
  const db = fresh();
  assert.equal(code(() => D.decide(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'REPROVADO' })), 'COMENTARIO_OBRIGATORIO');
});

test('aprovação de distribuição sinaliza arquivo sem conferência humana e conta não verificada', () => {
  const db = fresh(); const r = approveAll(db);
  assert.ok(r.flags.some((f) => f.startsWith('CONTA_NAO_VERIFICADA')));
});

test('alterar destino (horário) invalida a autorização e bloqueia a publicação agendada', () => {
  const db = fresh(); approveAll(db);
  const id = D.schedulePublication(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', target_id: tgt(db, 'RDZ_VIDEO_003'), scheduled_for: '2026-10-31T13:00:00Z', provider: 'manual', provider_ref: 'MC-123' });
  assert.equal(db.prepare('SELECT status FROM publications WHERE id=?').get(id).status, 'AGENDADO');
  const t = db.prepare('SELECT * FROM targets WHERE id=?').get(tgt(db, 'RDZ_VIDEO_003'));
  D.upsertTarget(db, admin, 'rdz', { ...t, file_ids: JSON.parse(t.file_ids), window_start: '2026-10-31T14:00:00-03:00', window_end: '2026-10-31T14:00:00-03:00' });
  const pub = db.prepare('SELECT * FROM publications WHERE id=?').get(id);
  assert.equal(pub.status, 'FALHA'); assert.match(pub.last_error, /AUTORIZACAO_INVALIDADA/); assert.equal(pub.external_cancel_pending, 1);
  const a = db.prepare("SELECT * FROM approvals WHERE stage='DISTRIBUICAO'").get();
  assert.ok(a.invalidated_at, 'histórico preservado e marcado como invalidado');
  const c = db.prepare("SELECT * FROM contents WHERE id='RDZ_VIDEO_003'").get();
  assert.equal(D.contentStatus(db, 'rdz', c), 'EM_REVISAO_DISTRIBUICAO');
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', target_id: t.id, scheduled_for: '2026-10-31T17:00:00Z', provider: 'manual', provider_ref: 'x' })), 'SEM_AUTORIZACAO_DISTRIBUICAO');
});

test('substituir arquivo invalida distribuição; criação continua válida', () => {
  const db = fresh(); approveAll(db);
  const ig = db.prepare("SELECT id FROM files WHERE content_id='RDZ_VIDEO_003' AND channel='INSTAGRAM'").get().id;
  D.replaceFile(db, admin, 'rdz', ig, { drive_id: 'NOVO', size: 1 });
  const st = db.prepare('SELECT stage, invalidated_at FROM approvals ORDER BY rowid').all();
  assert.equal(st.find((a) => a.stage === 'DISTRIBUICAO').invalidated_at != null, true);
  assert.equal(st.find((a) => a.stage === 'CRIACAO').invalidated_at, null);
});

test('divergência de tamanho na conferência invalida a distribuição', () => {
  const db = fresh(); approveAll(db);
  const f = db.prepare("SELECT id FROM files WHERE content_id='RDZ_VIDEO_003' AND channel='INSTAGRAM'").get().id;
  D.verifyFile(db, admin, 'rdz', f, { level: 'EXISTE_NO_DRIVE', observed_size: 1 });
  assert.ok(db.prepare("SELECT invalidated_at FROM approvals WHERE stage='DISTRIBUICAO'").get().invalidated_at);
});

test('alterar texto cria nova versão, invalida ambas as autorizações e mantém histórico', () => {
  const db = fresh(); approveAll(db);
  const r = D.reviseContent(db, admin, 'rdz', 'RDZ_VIDEO_003', { text: 'novo texto' }, 'correção');
  assert.deepEqual([r.version, r.bumped], [2, true]);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM content_versions WHERE content_id=?').get('RDZ_VIDEO_003').n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM approvals WHERE invalidated_at IS NOT NULL').get().n, 2);
  const c = db.prepare("SELECT * FROM contents WHERE id='RDZ_VIDEO_003'").get();
  assert.equal(D.contentStatus(db, 'rdz', c), 'EM_REVISAO_CRIACAO');
  assert.equal(code(() => D.decide(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'APROVADO' })), 'VERSAO_DESATUALIZADA');
});

test('janela, duplicidade e provedores', () => {
  const db = fresh(); approveAll(db); const t = tgt(db, 'RDZ_VIDEO_003');
  const base = { content_id: 'RDZ_VIDEO_003', target_id: t, provider: 'manual', provider_ref: 'MC-1' };
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { ...base, scheduled_for: '2026-10-31T16:00:00Z' })), 'FORA_DA_JANELA');
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { ...base, provider: 'metricool', scheduled_for: WIN })), 'CONTA_NAO_VERIFICADA');
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { ...base, provider: 'simulated', scheduled_for: WIN })), 'SIMULACAO_DESABILITADA');
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { ...base, provider_ref: undefined, scheduled_for: WIN })), 'REFERENCIA_OBRIGATORIA');
  D.schedulePublication(db, admin, 'rdz', { ...base, scheduled_for: WIN });
  assert.equal(code(() => D.schedulePublication(db, admin, 'rdz', { ...base, scheduled_for: WIN })), 'PUBLICACAO_DUPLICADA');
});

test('máquina de estados da publicação exige evidência', () => {
  const db = fresh(); approveAll(db);
  const id = D.schedulePublication(db, admin, 'rdz', { content_id: 'RDZ_VIDEO_003', target_id: tgt(db, 'RDZ_VIDEO_003'), scheduled_for: WIN, provider: 'manual', provider_ref: 'MC-1' });
  assert.equal(code(() => D.transitionPublication(db, agent, 'rdz', id, 'PUBLICADO', { public_url: 'x' })), 'TRANSICAO_INVALIDA');
  D.transitionPublication(db, agent, 'rdz', id, 'EM_PUBLICACAO');
  assert.equal(code(() => D.transitionPublication(db, agent, 'rdz', id, 'PUBLICADO', {})), 'EVIDENCIA_OBRIGATORIA');
  D.transitionPublication(db, agent, 'rdz', id, 'RESULTADO_INCERTO', { error: 'API não respondeu' });
  assert.equal(code(() => D.transitionPublication(db, agent, 'rdz', id, 'PUBLICADO', { public_url: 'https://i/p/1' })), 'SOMENTE_ADMIN');
  D.transitionPublication(db, admin, 'rdz', id, 'PUBLICADO', { public_url: 'https://instagram.com/p/1' });
  assert.equal(db.prepare('SELECT status FROM publications WHERE id=?').get(id).status, 'PUBLICADO');
  assert.equal(code(() => D.transitionPublication(db, admin, 'rdz', id, 'FALHA', { error: 'x' })), 'TRANSICAO_INVALIDA');
});

test('isolamento entre empresas', () => {
  const db = fresh();
  db.prepare("INSERT INTO companies VALUES('outra','Outra','x')").run();
  assert.equal(code(() => D.getContent(db, 'outra', 'RDZ_VIDEO_003')), 'CONTEUDO_INEXISTENTE');
  assert.equal(code(() => D.decide(db, admin, 'outra', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'APROVADO' })), 'SEM_ACESSO');
  const both = { ...admin, companies: ['rdz', 'outra'] };
  assert.equal(code(() => D.decide(db, both, 'outra', { content_id: 'RDZ_VIDEO_003', version: 1, stage: 'CRIACAO', decision: 'APROVADO' })), 'CONTEUDO_INEXISTENTE');
  assert.equal(code(() => D.upsertTarget(db, both, 'outra', { content_id: 'x', channel: 'INSTAGRAM' })), 'CONTEUDO_INEXISTENTE');
});

test('tarefas: dependência, evidência e atribuição', () => {
  const db = fresh();
  const dep = D.createTask(db, admin, 'rdz', { title: 'a' });
  const dependente = D.createTask(db, admin, 'rdz', { title: 'b', depends_on: [dep] });
  assert.equal(code(() => D.updateTask(db, admin, 'rdz', dependente, { status: 'EM_ANDAMENTO' })), 'DEPENDENCIAS_PENDENTES');
  const t = D.createTask(db, admin, 'rdz', { title: 'x', agent_id: 'rdz-chatgpt' });
  assert.equal(code(() => D.updateTask(db, agent, 'rdz', t, { status: 'EM_ANDAMENTO' })), 'TAREFA_DE_OUTRO_AGENTE');
  assert.equal(code(() => D.updateTask(db, admin, 'rdz', t, { status: 'CONCLUIDA' })), 'EVIDENCIA_OBRIGATORIA');
  assert.equal(code(() => D.updateTask(db, admin, 'rdz', t, { status: 'FALHA' })), 'MOTIVO_OBRIGATORIO');
});

test('CSV: aspas, vírgulas e deduplicação idempotente', () => {
  const rows = parseCsv('﻿tema,publico,formato,origem,indice_0a100\r\n"Selic caiu, juros não",PF,Reels,radar,"71,5"\r\n"Selic caiu, juros não",PF,Reels,plano semana,71.5\r\n');
  assert.equal(rows.length, 2); assert.equal(rows[0].tema, 'Selic caiu, juros não');
  const db = fresh();
  assert.deepEqual(importRows(db, admin, 'rdz', 'pauta', rows), { inserted: 1, merged: 1, skipped: 0 });
  assert.deepEqual(importRows(db, admin, 'rdz', 'pauta', rows), { inserted: 0, merged: 2, skipped: 0 });
  const it = db.prepare('SELECT * FROM market_items').get();
  assert.equal(it.nature, 'SUGESTAO'); assert.deepEqual(JSON.parse(it.data).vista_em.sort(), ['plano semana', 'radar']);
});

test('notícias com a mesma URL (query diferente) são uma só', () => {
  const db = fresh();
  const hdr = 'id,titulo,fonte,tipo_fonte,confiabilidade_1a5,data_publicacao,data_do_fato,coletado_em,temas,publico,resumo,numeros,flags,url\n';
  const r = parseCsv(hdr + 'a,T,F,primaria,5,2026-10-01,,2026-10-30,x,y,r,n,,https://x.com/a?utm=1\nb,T2,F,primaria,5,2026-10-01,,2026-10-30,x,y,r,n,,https://x.com/a/');
  assert.equal(importRows(db, admin, 'rdz', 'noticia', r).inserted, 1);
  assert.equal(db.prepare('SELECT nature FROM market_items').get().nature, 'FATO');
});
