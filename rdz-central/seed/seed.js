// Carga inicial da empresa RDZ. Todos os IDs de Drive abaixo foram lidos do Drive em 2026-10-30
// (metadados via conector); nada aqui é inventado. Koreon BR / Koreon EN NÃO são criadas (apenas a arquitetura as comporta).
import { randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from '../src/db.js';
import * as D from '../src/domain.js';

const SYS = { kind: 'admin', id: 'seed', name: 'seed', companies: ['rdz'] };
const furl = (id) => `https://drive.google.com/file/d/${id}/view`;
const BY = 'claude-sessao-implementacao';
const NOTE = 'Existência e tamanho conferidos nos metadados do Drive em 2026-10-30; conteúdo (reprodução) NÃO reverificado pela central.';

const ORDER_AUTH = 'Ordem de produção cita pedido do usuário em 30/10/2026, mas não há registro de aprovação nesta central: autorização de criação PENDENTE.';
const CTA = (w) => ({ WHATSAPP: 'Quer entender mais? Entre agora em contato com nossa equipe.', INSTAGRAM: `Quer entender mais? Comente ${w} e nossa equipe entrará em contato.`, TIKTOK: `Quer entender mais? Comente ${w} e nossa equipe entrará em contato.` });

const VIDEOS = [
  { id: 'RDZ_VIDEO_001', title: 'Como o banco enxerga seu CNPJ? (rating bancário)', service: 'Rating bancário', audience: 'Empresários (PJ)', kw: 'RATING', text: null,
    brief: 'Tema RATING. Roteiro de origem RDZ_VIDEO_001_v01_ROTEIRO.txt (id 1yA8roCDrgnGj1yvPZ6trtin6p-iQvz5_, citado no ENTREGA.txt; não lido nesta sessão).',
    roteiro: null, entrega: ['1tcXQSQ_YNEoFViRgmpqqBJTNioQJwuiU', 2306], capa: ['1CPn_DwQ-WznE7bX6jsequ6w7bGghi9dn', 1107720],
    mp4: { WHATSAPP: ['1ixGQFnhTRdH4wGydx7BSF_rzyyFjiYLw', 9024768], INSTAGRAM: ['1NcMGVKj8Tcp-DqGZjChEIW7VOMDAQC1A', 9037952], TIKTOK: ['1skDIToavXxmAIIP-5YpoBUGRUX8CmYQN', 9037952] },
    folder: '1MXEpOB6wLp5i4TEcB8hm3ecyfHqBBCO_', igWindow: null, delivered: '2026-10-30T04:06:33Z' },
  { id: 'RDZ_VIDEO_002', title: 'Limpa Nome: o que é a liminar e o que ela não faz', service: 'Limpa Nome', audience: 'Pessoa física negativada', kw: 'NOME',
    declared: '3ac052f81648449289513127fc302d842b3acaae2e276a87d49b3d9516f985cc',
    text: ['Seu nome está negativado e você quer entender quais caminhos existem para o seu caso?', 'O serviço Limpa Nome da RDZ começa pela análise da sua situação e dos apontamentos existentes.',
      'Após a analise , é realizado um pedido de liminar para suspender temporariamente os registros abrangidos pela ação nos órgãos de proteção ao credito. ', 'Essa suspensão não quita a dívida: a obrigação com o credor permanece.',
      'A RDZ acompanha o procedimento e orienta os próximos passos.', 'O prazo estimado informado para o serviço é de 30 a 45 dias, podendo variar conforme decisão judicial.'].join('\n\n'),
    roteiro: ['1yBBr0j4C5RIe6n5f5WXlc3gzr9Lq0lze', 2774], entrega: ['1j01JzqbRPrCsVUVsulIR3eGm1AjVbqGq', 1620], capa: ['1MA6CKadQAI5S56RpPmfZm0H75q7fLVtb', 1093706],
    mp4: { WHATSAPP: ['1nHAz4CMkddiwhJ9vTptlmj5NN7TNlMrj', 9275593], INSTAGRAM: ['1TolkTbdG8Tr0Yd-gLtTWLBm4O_6UIoVC', 9263381], TIKTOK: ['1h9SvSiYruSBkW3vaV2Oju7_Kj3pYzV4r', 9263381] },
    folder: '1am1YXo4DsmNo46godHztmC410yubBlWP', igWindow: '2026-10-30T10:00:00-03:00', delivered: '2026-10-30T13:44:20Z' },
  { id: 'RDZ_VIDEO_003', title: 'Score: dúvidas sobre a sua pontuação', service: 'Score', audience: 'Pessoa física (nome limpo)', kw: 'SCORE',
    declared: '5697ff578b32c1b336a84e35d66dccf2cf0a93a77400d8a14ef998a240f50d0f',
    text: ['Seu nome está limpo, mas você ainda tem dúvidas sobre o seu score?', 'Score é uma pontuação usada para auxiliar a análise de risco de crédito.',
      'No serviço da RDZ, são conferidos e atualizados os dados cadastrais junto aos órgãos de proteção ao crédito.',
      'Consultas não reconhecidas ou indevidas também podem ser analisadas para eventual pedido de exclusão. Aumento a pontuação da sua pontuação', 'A RDZ ajuda a identificar inconsistências e orientar a organização do seu perfil.',
      'O prazo estimado informado para essas etapas é de 15 a 20 dias. '].join('\n\n'),
    roteiro: ['1Ag4FJjIChZ-owhNicnedrPBqicAbl_9x', 2742], entrega: ['1XwasK-h_N3Us4asqEyRZtANSy09DuSdE', 2118], capa: ['15RyNwaMsIUlJRSi2oOg4--cpoLSAD8VU', 1081350],
    mp4: { WHATSAPP: ['1RwFUWRcbymQq_CRc1tdzzkpj8o9c8CiB', 8912204], INSTAGRAM: ['1PE4rUrMEfgNiLrbEey_AbYzP6gZvpGKA', 8910664], TIKTOK: ['1az43lpg2wY3-aigaShyjrvz4yG8sF_1u', 8910664] },
    folder: '16LuUBOQMq2HwVjQzBlafquFNO4zfnEDn', igWindow: '2026-10-31T10:00:00-03:00', delivered: '2026-10-30T14:50:52Z',
    warn: 'O produtor alertou: "Aumento a pontuação da sua pontuação" pode ser lida como promessa de aumento de score (a Serasa afirma que score não aumenta mediante pagamento). Texto mantido literal por decisão do usuário.' },
  { id: 'RDZ_VIDEO_004', title: 'Rating bancário: como o banco avalia sua empresa', service: 'Rating bancário', audience: 'Empresários (PJ)', kw: 'RATING',
    declared: '3074183b8a9238723fc812e3afd243a60a03a0b128578a48ba81c79b707c0f34',
    text: ['Você sabe como o banco avalia o perfil da sua empresa?', 'Rating bancário é a classificação de risco utilizada pela instituição na análise do cliente.',
      'No procedimento da RDZ, são revisados os dados cadastrais e financeiros e solicitadas as atualizações cabíveis perante as instituições e os órgãos envolvidos.',
      'O objetivo é manter as informações corretas e atualizadas, ajudando a aumentar sua classificação financeira', 'O prazo estimado informado para o procedimento é de 15 a 20 dias.'].join('\n\n'),
    roteiro: ['1rO_OOH1s6GMVe5CuGAuqSByIkglMpwWA', 2687], entrega: null, capa: null, mp4: {}, folder: '1t2bDpi1FQoPWqF23rkqyW392g1ZRJy7c', igWindow: '2026-11-01T10:00:00-03:00', delivered: null },
];

export function seedRdz(db, { adminToken, agentTokens = {} } = {}) {
  const th = (t) => (t ? D.sha256(t) : null);
  db.prepare('INSERT INTO companies(id,name,created_at) VALUES(?,?,?)').run('rdz', 'RDZ Consultoria Financeira', new Date().toISOString());
  db.prepare('INSERT INTO users(id,name,role,token_hash) VALUES(?,?,?,?)').run('admin-rdz', 'Administrador RDZ', 'admin', th(adminToken) ?? th(randomBytes(24).toString('hex')));
  db.prepare('INSERT INTO user_companies VALUES(?,?)').run('admin-rdz', 'rdz');

  const agents = [
    ['rdz-chatgpt', 'ChatGPT Cowork', 'Criação de conteúdo: estratégia, planejamento, textos, imagens e roteiros para Instagram, TikTok e WhatsApp', ['planejamento', 'textos', 'imagens', 'roteiros', 'verificar_arquivos'], 'ChatGPT Cowork (externo; Metricool via ChatGPT)', null, null],
    ['rdz-linkedin', 'Agente LinkedIn', 'Conteúdo empresarial para LinkedIn', ['conteudo_linkedin'], 'Agente LinkedIn (externo)', null, null],
    ['rdz-claude-pesq', 'Claude · Pesquisador', 'Claude Cowork: pesquisa de mercado e sugestão de pautas', ['pesquisa_mercado', 'pautas', 'radar_diario', 'auditoria_semanal'], 'Claude Cowork (tarefa agendada) + Google Drive', '2026-10-30T17:56:58Z', 'Evidência: documento "Radar RDZ - 2026-10-30" no Drive (id 1rsX-89mW_rOyV7et5aDMvZiU1_0IXjFB0oMO1mQMHWU)'],
    ['rdz-claude-tec', 'Claude · Técnico', 'Claude Cowork: produção de vídeos e distribuição autorizada (por ora WhatsApp)', ['producao_video', 'exportar_mp4', 'distribuicao_whatsapp_autorizada'], 'Claude Cowork + ElevenLabs + Google Drive', '2026-10-30T14:50:52Z', 'Evidência: RDZ_VIDEO_003_v01_ENTREGA.txt no Drive (id 1XwasK-h_N3Us4asqEyRZtANSy09DuSdE)'],
  ];
  for (const [id, name, role, caps, integ, last, sum] of agents) {
    db.prepare('INSERT INTO agents(id,company_id,name,role,capabilities,integration,config,state,last_activity_at,last_run_summary,token_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, 'rdz', name, role, JSON.stringify(caps), integ, JSON.stringify({ observacao: 'Configuração real do agente fora da central; não verificada aqui.' }),
        'NAO_VERIFICADO', last, sum, th(agentTokens[id]));
  }

  const accounts = [['rdz-ig', 'INSTAGRAM', 'Instagram @rdz_consultoria (via Metricool, marca RDZ)'], ['rdz-tt', 'TIKTOK', 'TikTok RDZ'], ['rdz-wa', 'WHATSAPP', 'WhatsApp RDZ'], ['rdz-li', 'LINKEDIN', 'LinkedIn RDZ']];
  for (const [id, ch, label] of accounts) {
    db.prepare('INSERT INTO accounts(id,company_id,channel,label,provider,external_ref,status,note) VALUES(?,?,?,?,?,?,?,?)')
      .run(id, 'rdz', ch, label, ch === 'WHATSAPP' ? null : 'metricool', ch === 'WHATSAPP' ? null : 'brandId 7678759',
        'NAO_VERIFICADA', 'Identidade e conexão ainda não conferidas. brandId 7678759 informado pelo usuário; sem acesso ao Metricool nesta instância.');
  }

  const integ = [
    ['drive-conector', 'Google Drive (conector da sessão de implementação)', 'VERIFICADO', 'Pastas e arquivos da central listados e lidos em 2026-10-30. Hoje o Google Drive é o banco de dados da operação (arquivos e planilhas); a central lê dele, não o substitui. Vale apenas para a sessão do Claude; o servidor da central não tem credencial própria.'],
    ['drive-servidor', 'Google Drive (leitura automática pelo servidor da central)', 'NAO_CONFIGURADO', 'PENDENTE: credencial (conta de serviço/OAuth) para o servidor listar pastas e exportar planilhas. Até lá, importar CSV exportado manualmente.'],
    ['metricool', 'Metricool (marca RDZ, brandId 7678759)', 'NAO_CONFIGURADO', 'PENDENTE: nenhuma ferramenta nem token Metricool disponível nesta instância. Identidade da marca e contas conectadas NÃO conferidas. Nenhum agendamento é feito por esta integração.'],
    ['central-web-anterior', 'Central web existente (rdz-central-marketing.redseal36.chatgpt.site)', 'NAO_VERIFICADO', 'Código-fonte não disponível neste repositório e URL inacessível do ambiente (403 do proxy). Nada reaproveitado; esta aplicação é nova e não altera a anterior.'],
  ];
  for (const [id, name, st, detail] of integ) db.prepare('INSERT INTO integrations(id,company_id,name,status,detail,checked_at,checked_by) VALUES(?,?,?,?,?,?,?)').run(id, 'rdz', name, st, detail, new Date().toISOString(), BY);

  const sheets = [
    ['src-noticias', 'noticia', 'RDZ_BD_Noticias', '1FnVQXVhxDJyORrgZRhTjVtEN3VRsPL_BSBP5WSMm-bI'], ['src-concorrentes', 'concorrente', 'RDZ_BD_Concorrentes', '1uA1IPbbLHLjBnNh4pvuBhSI48Rtsg3RTHFgM2ouoMaU'],
    ['src-posts', 'post', 'RDZ_BD_Posts_Instagram', '1EnoHD2MSJDguFtqe6APpZ5lNlEEXxSVegL-e_ozY0OY'], ['src-pautas', 'pauta', 'RDZ_BD_Pautas', '1PmUsgDsqMA_lIQ3GOXPWiuSKCcNE1SWFMOdsurYNW1U'],
  ];
  for (const [id, kind, name, drive] of sheets) db.prepare('INSERT INTO market_sources(id,company_id,kind,name,drive_id,drive_url) VALUES(?,?,?,?,?,?)')
    .run(id, 'rdz', kind, name, drive, `https://docs.google.com/spreadsheets/d/${drive}/edit`);

  const fileBase = (cid, kind, ch, name, [id, size], mime) => ({ content_id: cid, kind, channel: ch, name, drive_id: id, drive_url: furl(id), size, mime,
    verification_level: 'EXISTE_NO_DRIVE', verified_by: BY, verified_at: new Date().toISOString(), verification_note: NOTE });

  for (const v of VIDEOS) {
    D.createContent(db, SYS, 'rdz', { id: v.id, title: v.title, kind: 'VIDEO', service: v.service, objective: 'Geração de leads', audience: v.audience, owner: 'Administrador RDZ',
      origin_ref: `Drive 02_Roteiros_Pendentes / ${v.id}_v01_ROTEIRO.txt`, text: v.text, declared_sha256: v.declared ?? null,
      brief: [v.brief, v.warn, v.declared ? `SHA-256 declarado na ordem (${v.declared}) NÃO reproduzido pela extração de texto (quebras/espaços exatos desconhecidos); texto exibido é a transcrição do Drive.` : null, ORDER_AUTH].filter(Boolean).join('\n'),
      channels: ['WHATSAPP', 'INSTAGRAM', 'TIKTOK'], planned_for: v.igWindow });
    const ids = {};
    if (v.roteiro) ids.roteiro = D.addFile(db, SYS, 'rdz', fileBase(v.id, 'ROTEIRO', null, `${v.id}_v01_ROTEIRO.txt`, v.roteiro, 'text/plain'));
    for (const [ch, meta] of Object.entries(v.mp4)) ids[ch] = D.addFile(db, SYS, 'rdz', { ...fileBase(v.id, 'VIDEO', ch, `${v.id}_v01_${ch[0] + ch.slice(1).toLowerCase().replace('tiktok', 'TikTok').replace('whatsapp', 'WhatsApp')}.mp4`, meta, 'video/mp4'),
      verification_note: `${NOTE} Produtor relatou decodificação completa e CTA "${CTA(v.kw)[ch]}" (não reverificado).` });
    if (v.capa) ids.capa = D.addFile(db, SYS, 'rdz', fileBase(v.id, 'CAPA', null, `${v.id}_v01_CAPA.png`, v.capa, 'image/png'));
    if (v.entrega) ids.entrega = D.addFile(db, SYS, 'rdz', fileBase(v.id, 'RELATORIO_PRODUCAO', null, `${v.id}_v01_ENTREGA.txt`, v.entrega, 'text/plain'));
    if (v.igWindow && ids.INSTAGRAM) {
      D.upsertTarget(db, SYS, 'rdz', { content_id: v.id, channel: 'INSTAGRAM', account_id: 'rdz-ig', destination: 'Instagram RDZ (feed/Reels a confirmar)', audience: v.audience,
        window_start: v.igWindow, window_end: v.igWindow, file_ids: [ids.INSTAGRAM, ids.capa].filter(Boolean) });
    }
    // tarefas
    const prod = D.createTask(db, SYS, 'rdz', { id: `T_${v.id}_PRODUCAO`, content_id: v.id, agent_id: 'rdz-claude-tec', title: `Produzir 3 versões MP4 + capa + relatório (${v.id} v01)`,
      input: `Ordem de produção ${v.id}_v01_ROTEIRO.txt`, expected_output: 'WhatsApp.mp4, Instagram.mp4, TikTok.mp4, capa e ENTREGA.txt na subpasta de saída',
      completion_criteria: 'Três MP4 reproduzíveis, tamanho > 0, texto literal, CTA correto por canal, ENTREGA.txt com links', owner: 'Claude · Técnico', priority: 'ALTA' });
    if (v.entrega) D.updateTask(db, SYS, 'rdz', prod, { status: 'EM_ANDAMENTO' }), D.updateTask(db, SYS, 'rdz', prod, { evidence: { type: 'drive', url: furl(v.entrega[0]), note: `ENTREGA.txt (${v.delivered})` }, status: 'CONCLUIDA' });
    if (v.igWindow) D.createTask(db, SYS, 'rdz', { id: `T_${v.id}_AGENDAR_IG`, content_id: v.id, agent_id: 'rdz-chatgpt', title: `Conferir arquivo e agendar Instagram (${v.id})`, depends_on: [prod],
      input: `Janela solicitada ${v.igWindow}`, expected_output: 'Agendamento com ID do Metricool, data/hora e link; ou bloqueio justificado',
      completion_criteria: 'Só executar com autorização de DISTRIBUIÇÃO válida na central cobrindo este destino', owner: 'ChatGPT', priority: 'ALTA', due_at: new Date(v.igWindow).toISOString() });
  }
  D.createTask(db, SYS, 'rdz', { id: 'T_RADAR_20261030', agent_id: 'rdz-claude-pesq', title: 'Radar RDZ 30/10/2026 + bancos de dados de mercado', expected_output: 'Documento Radar, planilhas Noticias/Concorrentes/Posts/Pautas',
    completion_criteria: 'Fontes com link e data; fatos separados de interpretações', owner: 'Claude · Pesquisador' });
  D.updateTask(db, SYS, 'rdz', 'T_RADAR_20261030', { status: 'EM_ANDAMENTO' });
  D.updateTask(db, SYS, 'rdz', 'T_RADAR_20261030', { evidence: { type: 'drive', url: 'https://docs.google.com/document/d/1rsX-89mW_rOyV7et5aDMvZiU1_0IXjFB0oMO1mQMHWU/edit', note: 'Radar RDZ - 2026-10-30' }, status: 'CONCLUIDA' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.env.RDZ_DB || 'data/rdz.sqlite';
  const db = openDb(path);
  if (db.prepare('SELECT 1 FROM companies LIMIT 1').get()) { console.error('Banco já populado; apague data/ para recomeçar.'); process.exit(1); }
  const tok = () => randomBytes(24).toString('hex');
  const adminToken = process.env.RDZ_ADMIN_TOKEN || tok();
  const agentTokens = Object.fromEntries(['rdz-chatgpt', 'rdz-linkedin', 'rdz-claude-pesq', 'rdz-claude-tec'].map((a) => [a, tok()]));
  seedRdz(db, { adminToken, agentTokens });
  mkdirSync('data', { recursive: true });
  writeFileSync('data/tokens.json', JSON.stringify({ admin: adminToken, agents: agentTokens }, null, 2), { mode: 0o600 });
  console.log('Seed concluído. Tokens gravados em data/tokens.json (não versionado).');
}
