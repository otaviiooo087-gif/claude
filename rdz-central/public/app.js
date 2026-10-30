const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let token = sessionStorage.getItem('tk') || ''; let company = sessionStorage.getItem('co') || ''; let me;
const fmt = (d) => (d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
const TONE = { VERIFICADO: 'ok', VERIFICADA: 'ok', PUBLICADO: 'ok', CONCLUIDA: 'ok', DISTRIBUICAO_AUTORIZADA: 'ok', APROVADO: 'ok', EXISTE_NO_DRIVE: 'ok', CONFERIDO_PELO_ADMIN: 'ok',
  FALHA: 'bad', REPROVADO: 'bad', DIVERGENTE: 'bad', NAO_CONFIGURADO: 'bad', RESULTADO_INCERTO: 'bad', AJUSTE_SOLICITADO: 'warn', NAO_VERIFICADO: 'warn', NAO_VERIFICADA: 'warn', NAO_CONFERIDO: 'warn', AGENDADO: 'warn', EM_PUBLICACAO: 'warn', RELATADO_PELO_AGENTE: 'warn' };
const tag = (s) => `<span class="tag ${TONE[s] ?? ''}">${esc(String(s ?? '—').replaceAll('_', ' '))}</span>`;

async function api(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'x-company': company, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || r.statusText); e.code = j.code; e.status = r.status; throw e; }
  return j;
}
async function act(path, body, after) { try { await api(path, body); await route(); if (after) after(); } catch (e) { alert(`${e.code ?? 'ERRO'}: ${e.message}`); } }
window.act = act; window.api = api;

const VIEWS = { dashboard: 'Dashboard', planejamento: 'Planejamento', aprovacoes: 'Aprovações', biblioteca: 'Biblioteca', mercado: 'Inteligência', agentes: 'Agentes e tarefas', publicacoes: 'Publicações', sistema: 'Status do sistema' };

const table = (heads, rows) => `<div class="tbl"><table><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}" class="mut">Nada registrado.</td></tr>`}</table></div>`;
const link = (c) => `<a href="#/conteudo/${esc(c.id ?? c.content_id)}">${esc(c.id ?? c.content_id)}</a>`;

const R = {
  async dashboard() {
    const d = await api('/api/dashboard');
    const list = (a, f) => (a.length ? a.map(f).join('') : '<div class="mut">Nenhum.</div>');
    return `<h2>Dashboard</h2><div class="grid">
    <div class="card"><h3>Aguardam autorização de criação (${d.pendentes_criacao.length})</h3>${list(d.pendentes_criacao, (c) => `<div>${link(c)} — ${esc(c.title)}</div>`)}</div>
    <div class="card"><h3>Aguardam autorização de distribuição (${d.pendentes_distribuicao.length})</h3>${list(d.pendentes_distribuicao, (c) => `<div>${link(c)} — ${esc(c.title)}</div>`)}</div>
    <div class="card"><h3>Tarefas atrasadas (${d.tarefas_atrasadas.length})</h3>${list(d.tarefas_atrasadas, (t) => `<div>${esc(t.title)} <span class="mut">prazo ${fmt(t.due_at)}</span> ${tag(t.status)}</div>`)}</div>
    <div class="card"><h3>Janelas de publicação vencidas sem publicação (${d.janelas_sem_publicacao.length})</h3>${list(d.janelas_sem_publicacao, (t) => `<div>${link(t)} · ${t.channel} <span class="bad">janela ${fmt(t.window_end)}</span></div>`)}</div>
    <div class="card"><h3>Próximas publicações</h3>${list(d.proximas_publicacoes, (p) => `<div>${link(p)} · ${p.channel} · ${fmt(p.scheduled_for)} ${tag(p.status)} ${p.simulated ? '<span class="tag sim">SIMULADO</span>' : ''}</div>`)}</div>
    <div class="card"><h3>Publicações com problema</h3>${list(d.publicacoes_com_problema, (p) => `<div>${link(p)} ${tag(p.status)} <span class="mut">${esc(p.last_error)}</span>${p.external_cancel_pending ? ' <span class="tag bad">cancelar no provedor</span>' : ''}</div>`)}</div>
    <div class="card"><h3>Saúde das integrações</h3>${list(d.integracoes, (i) => `<div>${tag(i.status)} ${esc(i.name)}</div>`)}</div>
    <div class="card"><h3>Última execução dos agentes</h3>${list(d.agentes, (a) => `<div><b>${esc(a.name)}</b> ${tag(a.state)}<br><span class="mut">${fmt(a.last_activity_at)} · ${esc(a.last_run_summary ?? 'sem atividade registrada')}</span></div>`)}</div></div>`;
  },
  async planejamento() {
    const rows = await api('/api/contents');
    return `<h2>Planejamento editorial</h2>` + table(['ID', 'v', 'Título', 'Serviço', 'Público', 'Canais', 'Janela planejada', 'Estado'],
      rows.map((c) => [link(c), c.current_version, esc(c.title), esc(c.service), esc(c.audience), c.version_info.channels.join(', '), fmt(c.version_info.planned_for), tag(c.status)]));
  },
  async aprovacoes() {
    const a = await api('/api/approvals');
    const q = (t, rows) => `<h3>${t} (${rows.length})</h3>` + table(['Conteúdo', 'v', 'Título', 'Estado'], rows.map((r) => [link(r), r.version, esc(r.title), tag(r.status)]));
    return `<h2>Aprovações</h2><p class="mut">Duas autorizações independentes. Abra o conteúdo para decidir; cada decisão fica presa à versão, aos arquivos, ao canal, ao destino e à janela.</p>${q('A · Criação', a.CRIACAO)}${q('B · Distribuição', a.DISTRIBUICAO)}`;
  },
  async biblioteca() {
    const f = await api('/api/library');
    return `<h2>Biblioteca de materiais</h2>` + table(['Conteúdo', 'v', 'Tipo', 'Canal', 'Arquivo (Drive)', 'Tamanho', 'Conferência', 'Por quem / quando'],
      f.map((x) => [link(x), x.version, x.kind, x.channel ?? '—', `<a href="${esc(x.drive_url)}" target="_blank" rel="noopener">${esc(x.name)}</a><br><span class="mut">${esc(x.drive_id)}</span>`, x.size?.toLocaleString('pt-BR') ?? '—',
        `${tag(x.verification_level)} ${x.status !== 'ATIVO' ? tag(x.status) : ''}<br><span class="mut">${esc(x.verification_note ?? '')}</span>`, `${esc(x.verified_by ?? '—')}<br>${fmt(x.verified_at)}`]));
  },
  async mercado() {
    const m = await api('/api/market');
    const sec = (k, t) => { const it = m.items.filter((i) => i.kind === k); return `<h3>${t} (${it.length})</h3>` + table(['Natureza', 'Título', 'Fonte', 'Publicação', 'Coleta', 'Relevância', 'Observação'],
      it.map((i) => [tag(i.nature), i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a>` : esc(i.title), esc(i.source), esc(i.published_at ?? '—'), esc(i.collected_at ?? '—'), i.relevance ?? (i.data.confiabilidade_1a5 ? `conf. ${i.data.confiabilidade_1a5}/5` : '—'),
        esc(i.data.interpretacao ?? i.data.cuidado ?? i.data.resumo ?? '')])); };
    return `<h2>Inteligência de mercado</h2><div class="card">${esc(m.notice)}</div><h3>Planilhas-fonte no Drive</h3>` +
      table(['Planilha', 'Tipo', 'Última importação', 'Linhas'], m.sources.map((s) => [`<a href="${esc(s.drive_url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`, s.kind, fmt(s.last_import_at), s.rows_imported])) +
      `<p class="mut">Importação: exporte a planilha como CSV e rode <code>npm run import-sheet -- &lt;tipo&gt; arquivo.csv &lt;id-fonte&gt;</code>. Leitura automática pelo servidor depende de credencial do Drive (pendente).</p>` +
      sec('noticia', 'Notícias (fatos)') + sec('concorrente', 'Concorrentes') + sec('post', 'Posts') + sec('pauta', 'Pautas (sugestões)');
  },
  async agentes() {
    const [ag, tk] = await Promise.all([api('/api/agents'), api('/api/tasks')]);
    return `<h2>Agentes</h2>` + table(['Agente', 'Papel', 'Capacidades', 'Integração', 'Estado', 'Última atividade'],
      ag.map((a) => [`<b>${esc(a.name)}</b>`, esc(a.role), a.capabilities.join(', '), esc(a.integration), tag(a.state), `${fmt(a.last_activity_at)}<br><span class="mut">${esc(a.last_run_summary ?? '')}</span>`])) +
      `<h2>Tarefas</h2>` + table(['ID', 'Conteúdo', 'Tarefa', 'Responsável', 'Depende de', 'Prioridade', 'Prazo', 'Estado', 'Tent.', 'Evidências / erros'],
        tk.map((t) => [esc(t.id), t.content_id ? link(t) : '—', `${esc(t.title)}<br><span class="mut">Saída: ${esc(t.expected_output ?? '—')}<br>Critério: ${esc(t.completion_criteria ?? '—')}</span>`, esc(t.owner ?? t.agent_id), esc(t.depends_on.join(', ') || '—'), t.priority,
          `${fmt(t.due_at)}${t.overdue ? ' <span class="tag bad">ATRASADA</span>' : ''}`, tag(t.status), t.attempts,
          t.evidence.map((e) => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.note ?? e.type)}</a>`).join('<br>') + t.errors.map((e) => `<div class="err">${esc(e.message)}</div>`).join('')]));
  },
  async publicacoes() {
    const p = await api('/api/publications');
    const next = { AGENDADO: ['EM_PUBLICACAO', 'FALHA'], EM_PUBLICACAO: ['PUBLICADO', 'FALHA', 'RESULTADO_INCERTO'], RESULTADO_INCERTO: ['PUBLICADO', 'FALHA'] };
    return `<h2>Publicações e mensagens</h2><p class="mut">Estados: AGENDADO · EM_PUBLICAÇÃO · PUBLICADO · FALHA · RESULTADO_INCERTO. PUBLICADO exige link público ou evidência.</p>` +
      table(['Conteúdo', 'Canal / conta', 'Destino', 'Horário', 'Aprovação', 'Provedor / ref.', 'Estado', 'Link / erro', 'Ações'],
        p.map((x) => [link(x), `${x.channel}<br><span class="mut">${esc(x.account_label)} ${tag(x.account_status)}</span>`, esc(x.destination), fmt(x.scheduled_for), esc(x.approval_id), `${esc(x.provider)}${x.simulated ? ' <span class="tag sim">SIMULADO</span>' : ''}<br>${esc(x.provider_ref ?? '')}`, tag(x.status),
          x.public_url ? `<a href="${esc(x.public_url)}" target="_blank" rel="noopener">link</a>` : `<span class="err">${esc(x.last_error ?? '')}</span>`,
          (next[x.status] ?? []).map((s) => `<button onclick="transition('${x.id}','${s}')">${s}</button>`).join(' ')]));
  },
  async sistema() {
    const [ig, ac] = await Promise.all([api('/api/integrations'), api('/api/accounts')]);
    return `<h2>Status do sistema</h2><h3>Integrações</h3>` + table(['Integração', 'Estado', 'Detalhe', 'Conferido'], ig.map((i) => [esc(i.name), tag(i.status), esc(i.detail), `${fmt(i.checked_at)} · ${esc(i.checked_by)}`])) +
      `<h3>Contas / destinos</h3>` + table(['Conta', 'Canal', 'Provedor', 'Ref.', 'Estado', 'Nota', ''], ac.map((a) => [esc(a.label), a.channel, esc(a.provider ?? '—'), esc(a.external_ref ?? '—'), tag(a.status), esc(a.note ?? ''),
        me.kind === 'admin' && a.status !== 'VERIFICADA' ? `<button onclick="verifyAccount('${a.id}')">Registrar verificação</button>` : ''])) +
      `<h3>Recursos</h3><div class="card"><b>Implementado:</b> cadastro multiempresa, conteúdos versionados, arquivos com IDs do Drive e níveis de conferência, destinos explícitos, aprovações A/B vinculadas ao escopo com invalidação, publicações com máquina de estados e evidência, tarefas com dependências, importador CSV com deduplicação, trilha de auditoria.<br>
      <b>Simulado:</b> provedor "simulated" (desligado por padrão; sempre marcado SIMULADO).<br><b>Pendente:</b> integração Metricool (verificação de marca/contas, agendamento e leitura de resultados), leitura automática do Drive pelo servidor, custos por tarefa vindos das ferramentas, calendário visual, empresas Koreon (arquitetura pronta; não configuradas).</div>`;
  },
  async conteudo(id) {
    const c = await api(`/api/contents/${encodeURIComponent(id)}`);
    const cur = c.current_version; const isAdmin = me.kind === 'admin';
    const files = c.files.filter((f) => f.version === cur); const targets = c.targets.filter((t) => t.version === cur && t.status === 'ATIVO');
    const lastValid = (stage) => c.approvals.find((a) => a.stage === stage && a.version === cur && a.validity.valid);
    const ctl = (stage) => isAdmin ? `<div class="row"><button class="pri" onclick="decide('${c.id}',${cur},'${stage}','APROVADO')">Aprovar</button><button onclick="decide('${c.id}',${cur},'${stage}','AJUSTE_SOLICITADO')">Solicitar ajuste</button><button class="dng" onclick="decide('${c.id}',${cur},'${stage}','REPROVADO')">Reprovar</button></div>` : '<span class="mut">Somente o administrador decide.</span>';
    return `<h2>${esc(c.id)} <span class="mut">v${cur}</span> ${tag(c.status)}</h2><p>${esc(c.title)} · ${esc(c.service)} · ${esc(c.audience)} · responsável: ${esc(c.owner)}</p>
    <div class="card"><b>Brief / observações</b><pre>${esc(c.version_info.brief)}</pre><b>Texto</b><pre>${esc(c.version_info.text ?? '(texto ainda não registrado)')}</pre><span class="mut">SHA-256 calculado: ${esc(c.version_info.text_sha256 ?? '—')}${c.version_info.declared_sha256 ? ` · declarado: ${esc(c.version_info.declared_sha256)}` : ''}</span></div>
    <h3>A · Autorização de criação</h3><div class="card">${lastValid('CRIACAO') ? `${tag('APROVADO')} por ${esc(lastValid('CRIACAO').decided_by)} em ${fmt(lastValid('CRIACAO').decided_at)}` : 'Sem autorização válida para esta versão.'}${ctl('CRIACAO')}</div>
    <h3>Arquivos (v${cur})</h3>${table(['Tipo', 'Canal', 'Arquivo', 'Conferência'], files.map((f) => [f.kind, f.channel ?? '—', `<a href="${esc(f.drive_url)}" target="_blank" rel="noopener">${esc(f.name)}</a>`, `${tag(f.verification_level)} ${f.status !== 'ATIVO' ? tag(f.status) : ''}<br><span class="mut">${esc(f.verified_by ?? '')} ${fmt(f.verified_at)}</span> ${isAdmin ? `<button onclick="confer('${f.id}')">Conferi</button>` : ''}`]))}
    <h3>Destinos (v${cur})</h3>${table(['', 'Canal', 'Conta', 'Destino', 'Público', 'Janela autorizável', 'Arquivos'], targets.map((t) => [`<input type="checkbox" class="tg" value="${t.id}" style="width:auto">`, t.channel, esc(t.account_id), esc(t.destination), esc(t.audience), `${fmt(t.window_start)} → ${fmt(t.window_end)}`, t.file_ids.length]))}
    <h3>B · Autorização de distribuição</h3><div class="card">Marque explicitamente os destinos que esta autorização cobre.<br>${lastValid('DISTRIBUICAO') ? `${tag('APROVADO')} cobre ${lastValid('DISTRIBUICAO').target_ids.join(', ')} · ${esc(lastValid('DISTRIBUICAO').decided_by)} em ${fmt(lastValid('DISTRIBUICAO').decided_at)}` : 'Sem autorização válida para esta versão.'}${ctl('DISTRIBUICAO')}</div>
    <h3>Histórico de decisões</h3>${table(['Quando', 'Etapa', 'v', 'Decisão', 'Por', 'Validade', 'Comentário / alertas'], c.approvals.map((a) => [fmt(a.decided_at), a.stage, a.version, tag(a.decision), esc(a.decided_by), a.decision !== 'APROVADO' ? '—' : (a.validity.valid ? tag('VERIFICADO') : `<span class="tag bad">INVALIDADA</span><br><span class="mut">${esc(a.validity.reason)}</span>`), `${esc(a.comment ?? '')}<br><span class="mut">${a.flags.map(esc).join('<br>')}</span>`]))}
    <h3>Versões</h3>${table(['v', 'Criada', 'Por', 'Motivo'], c.versions.map((v) => [v.version, fmt(v.created_at), esc(v.created_by), esc(v.reason)]))}
    <h3>Publicações</h3>${table(['Canal', 'Horário', 'Estado', 'Ref.'], c.publications.map((p) => [p.channel, fmt(p.scheduled_for), tag(p.status), esc(p.provider_ref ?? '')]))}
    ${isAdmin ? `<div class="card row"><b>Agendar/registrar publicação:</b><select id="ptg">${targets.map((t) => `<option value="${t.id}">${t.channel} · ${esc(t.destination)}</option>`).join('')}</select><input id="pwhen" placeholder="2026-10-31T10:00:00-03:00" style="max-width:260px"><input id="pref" placeholder="ID externo (ex.: Metricool)" style="max-width:220px"><button onclick="schedule('${c.id}')">Registrar</button></div>` : ''}`;
  },
};

window.decide = async (id, version, stage, decision) => {
  const body = { content_id: id, version, stage, decision };
  if (decision !== 'APROVADO') { body.comment = prompt('Comentário (obrigatório):'); if (!body.comment) return; }
  if (stage === 'DISTRIBUICAO' && decision === 'APROVADO') { body.target_ids = [...document.querySelectorAll('.tg:checked')].map((x) => x.value); if (!body.target_ids.length) return alert('Marque ao menos um destino.'); }
  try { const r = await api('/api/approvals', body); if (r.flags?.length) alert('Aprovado com alertas:\n' + r.flags.join('\n')); await route(); } catch (e) { alert(`${e.code}: ${e.message}`); }
};
window.confer = (id) => { const note = prompt('Como conferiu (ex.: assisti ao vídeo inteiro, CTA correto)?'); if (note) act(`/api/files/${id}/verify`, { level: 'CONFERIDO_PELO_ADMIN', note }); };
window.verifyAccount = (id) => { const note = prompt('Como a identidade/conexão foi conferida?'); if (note) act(`/api/accounts/${id}/verify`, { note }); };
window.schedule = (id) => act('/api/publications', { content_id: id, target_id: $('#ptg').value, scheduled_for: $('#pwhen').value, provider: 'manual', provider_ref: $('#pref').value });
window.transition = (id, to) => { const b = { to }; if (to === 'PUBLICADO') { b.public_url = prompt('Link público (ou deixe vazio e informe evidência):') || undefined; if (!b.public_url) b.evidence = prompt('Evidência:'); } if (to === 'FALHA' || to === 'RESULTADO_INCERTO') { b.error = prompt('Motivo:'); if (!b.error) return; } act(`/api/publications/${id}/transition`, b); };

async function route() {
  const [, v = 'dashboard', arg] = location.hash.slice(1).split('/');
  const view = v === 'conteudo' ? 'planejamento' : v;
  $('#nav').innerHTML = Object.entries(VIEWS).map(([k, t]) => `<a href="#/${k}" class="${k === view ? 'on' : ''}">${t}</a>`).join('');
  try { $('#main').innerHTML = await (R[v] ?? R.dashboard)(arg); } catch (e) { $('#main').innerHTML = `<p class="err">${esc(e.code ?? '')} ${esc(e.message)}</p>`; if (e.status === 401) login(); }
}
async function login() {
  token = prompt('Token de acesso (admin ou agente):') || ''; sessionStorage.setItem('tk', token); await start();
}
async function start() {
  try { me = await api('/api/me'); } catch { return login(); }
  if (!company || !me.companies.some((c) => c.id === company)) company = me.companies[0].id; sessionStorage.setItem('co', company);
  $('#co').innerHTML = me.companies.length > 1 ? `<select onchange="sessionStorage.setItem('co',this.value);location.reload()">${me.companies.map((c) => `<option value="${c.id}" ${c.id === company ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : esc(me.companies.find((c) => c.id === company).name);
  $('#who').textContent = `${me.kind === 'admin' ? 'Admin' : 'Agente'}: ${me.name}`; await route();
}
addEventListener('hashchange', route); start();
