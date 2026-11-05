const ROTULOS = {
  lead: 'Lead novo', consulta: 'Consulta de CPF', proposta: 'Proposta enviada', contrato: 'Contrato assinado',
  pago: 'Pagamento confirmado', andamento: 'Em andamento', limpo: 'Nome limpo', posvenda: 'Pós-venda', perdido: 'Perdido',
};
const STATUS = ['negativado', 'negociado', 'quitado'];
const app = document.getElementById('app');
const estado = { me: null, aba: 'funil' };

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (s) => (s ? s.split('-').reverse().join('/') : '');
const hoje = () => new Date().toISOString().slice(0, 10);
const cpfFmt = (c) => (c && c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : c || '');

// Cria elementos sem innerHTML: todo texto entra via textContent, o que evita XSS com dados de clientes.
function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) el.append(f.nodeType ? f : document.createTextNode(f));
  return el;
}

async function api(metodo, url, corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && estado.me) { estado.me = null; render(); }
  if (!r.ok) throw new Error(j.erro || 'Erro');
  return j;
}

function campo(rotulo, input) { return h('div', {}, h('label', {}, rotulo), input); }

// ---------- login ----------
function telaLogin() {
  let cadastro = false;
  const caixa = h('div', { class: 'login' });
  const desenhar = () => {
    const err = h('div', { class: 'err' });
    const f = {
      empresa: h('input', { placeholder: 'Nome da sua empresa' }), nome: h('input', { placeholder: 'Seu nome' }),
      email: h('input', { type: 'email', placeholder: 'voce@empresa.com' }), senha: h('input', { type: 'password', placeholder: 'Mínimo 8 caracteres' }),
    };
    const enviar = async () => {
      err.textContent = '';
      try {
        await api('POST', cadastro ? '/api/registrar' : '/api/login',
          cadastro ? { empresa: f.empresa.value, nome: f.nome.value, email: f.email.value, senha: f.senha.value } : { email: f.email.value, senha: f.senha.value });
        await iniciar();
      } catch (e) { err.textContent = e.message; }
    };
    caixa.replaceChildren(h('h2', { style: 'text-align:center' }, 'CRM Limpa Nome'),
      h('div', { class: 'panel' },
        cadastro && campo('Empresa', f.empresa), cadastro && campo('Seu nome', f.nome),
        campo('E-mail', f.email), campo('Senha', f.senha), err,
        h('div', { style: 'margin-top:12px' }, h('button', { class: 'p', style: 'width:100%', onclick: enviar }, cadastro ? 'Criar conta' : 'Entrar')),
        h('div', { style: 'text-align:center;margin-top:10px' },
          h('button', { class: 'link', onclick: () => { cadastro = !cadastro; desenhar(); } }, cadastro ? 'Já tenho conta' : 'Criar conta da minha empresa'))));
    caixa.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && enviar()));
  };
  desenhar();
  return caixa;
}

// ---------- estrutura ----------
function shell(conteudo) {
  const abas = [['funil', 'Funil'], ['clientes', 'Clientes'], ['tarefas', 'Tarefas'], ['painel', 'Painel']];
  return h('div', {},
    h('div', { class: 'top' }, h('b', {}, estado.me.empresa),
      h('nav', {}, abas.map(([k, n]) => h('button', { class: estado.aba === k ? 'on' : '', onclick: () => { estado.aba = k; render(); } }, n))),
      h('span', { class: 'mut' }, estado.me.nome),
      h('button', { onclick: async () => { await api('POST', '/api/logout'); estado.me = null; render(); } }, 'Sair')),
    h('main', {}, conteudo));
}

async function render() {
  if (!estado.me) return app.replaceChildren(telaLogin());
  const c = h('div', {});
  app.replaceChildren(shell(c));
  try {
    const tela = { funil: telaFunil, clientes: telaClientes, tarefas: telaTarefas, painel: telaPainel }[estado.aba];
    c.replaceChildren(await tela());
  } catch (e) { c.replaceChildren(h('div', { class: 'err' }, e.message)); }
}

// ---------- funil ----------
async function telaFunil() {
  const clientes = await api('GET', '/api/clientes');
  const kanban = h('div', { class: 'kanban' });
  for (const etapa of estado.me.etapas) {
    const lista = clientes.filter((c) => c.etapa === etapa);
    const col = h('div', { class: 'col' }, h('h3', {}, h('span', {}, ROTULOS[etapa]), h('span', {}, lista.length)));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault(); col.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      if (id) { await api('PATCH', `/api/clientes/${id}`, { etapa }).catch((x) => alert(x.message)); render(); }
    });
    for (const c of lista) {
      const card = h('div', { class: 'card', draggable: 'true', onclick: () => abrirFicha(c.id) },
        h('b', {}, c.nome), h('small', {}, c.telefone || 'Sem telefone'),
        h('small', {}, `Dívidas ${brl(c.total_dividas)} · Serviço ${brl(c.valor_servico)}`));
      card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(c.id)));
      col.append(card);
    }
    kanban.append(col);
  }
  return h('div', {}, h('div', { class: 'row', style: 'margin-bottom:14px' }, h('h2', { style: 'margin:0' }, 'Funil'), h('div', { class: 'sp' }),
    h('button', { class: 'p', onclick: () => abrirFicha(null) }, '+ Novo cliente')), kanban);
}

// ---------- clientes ----------
async function telaClientes() {
  const busca = h('input', { placeholder: 'Buscar por nome, CPF ou telefone', style: 'max-width:340px' });
  const corpo = h('tbody');
  const carregar = async () => {
    const lista = await api('GET', '/api/clientes?q=' + encodeURIComponent(busca.value));
    corpo.replaceChildren(...lista.map((c) => h('tr', { class: 'click', onclick: () => abrirFicha(c.id) },
      h('td', {}, c.nome), h('td', {}, cpfFmt(c.cpf)), h('td', {}, c.telefone), h('td', {}, h('span', { class: 'tag' }, ROTULOS[c.etapa])),
      h('td', {}, brl(c.total_dividas)), h('td', {}, brl(c.valor_servico)))));
    if (!lista.length) corpo.append(h('tr', {}, h('td', { colspan: 6, class: 'mut' }, 'Nenhum cliente encontrado.')));
  };
  let t; busca.addEventListener('input', () => { clearTimeout(t); t = setTimeout(carregar, 250); });
  await carregar();
  return h('div', {}, h('div', { class: 'row', style: 'margin-bottom:14px' }, h('h2', { style: 'margin:0' }, 'Clientes'), busca, h('div', { class: 'sp' }),
    h('button', { class: 'p', onclick: () => abrirFicha(null) }, '+ Novo cliente')),
    h('div', { class: 'panel', style: 'overflow-x:auto' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Nome', 'CPF', 'Telefone', 'Etapa', 'Dívidas', 'Serviço'].map((x) => h('th', {}, x)))), corpo)));
}

// ---------- ficha do cliente ----------
async function abrirFicha(id) {
  let c = id ? (await api('GET', `/api/clientes/${id}`)) : { dividas: [], parcelas: [], notas: [], tarefas: [], etapa: 'lead' };
  let aba = 'dados';
  const fundo = h('div', { class: 'modal' });
  const fechar = () => { fundo.remove(); render(); };
  fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(); });
  const box = h('div', { class: 'box' });
  fundo.append(box);
  document.body.append(fundo);
  const recarregar = async () => { c = await api('GET', `/api/clientes/${c.id}`); desenhar(); };

  function abaDados() {
    const f = {
      nome: h('input', { value: c.nome || '' }), cpf: h('input', { value: cpfFmt(c.cpf), placeholder: '000.000.000-00' }),
      telefone: h('input', { value: c.telefone || '' }), email: h('input', { value: c.email || '' }),
      origem: h('input', { value: c.origem || '', placeholder: 'Instagram, indicação, anúncio...' }),
      valor: h('input', { type: 'number', min: 0, step: '0.01', value: c.valor_servico || 0 }),
      etapa: h('select', {}, estado.me.etapas.map((e) => h('option', { value: e, selected: e === c.etapa }, ROTULOS[e]))),
      lgpd: h('input', { type: 'checkbox', checked: !!c.consentimento_lgpd, style: 'width:auto' }),
    };
    const err = h('div', { class: 'err' });
    const salvar = async () => {
      err.textContent = '';
      const corpo = { nome: f.nome.value, cpf: f.cpf.value, telefone: f.telefone.value, email: f.email.value, origem: f.origem.value,
        valor_servico: f.valor.value, etapa: f.etapa.value, consentimento_lgpd: f.lgpd.checked };
      try {
        if (c.id) { await api('PATCH', `/api/clientes/${c.id}`, corpo); fechar(); } else {
          const novo = await api('POST', '/api/clientes', corpo);
          c = { ...novo, dividas: [], parcelas: [], notas: [], tarefas: [] }; aba = 'dividas'; desenhar();
        }
      } catch (e) { err.textContent = e.message; }
    };
    return h('div', {},
      h('div', { class: 'two' }, campo('Nome', f.nome), campo('CPF', f.cpf), campo('Telefone / WhatsApp', f.telefone), campo('E-mail', f.email),
        campo('Origem do lead', f.origem), campo('Valor do serviço (R$)', f.valor), campo('Etapa', f.etapa)),
      h('label', { style: 'display:flex;gap:8px;align-items:center;color:var(--tx)' }, f.lgpd, 'Cliente autorizou o uso dos seus dados (LGPD)'),
      err,
      h('div', { class: 'row', style: 'margin-top:14px' },
        h('button', { class: 'p', onclick: salvar }, c.id ? 'Salvar' : 'Criar cliente'),
        c.id && h('button', { class: 'danger', onclick: async () => {
          if (confirm(`Excluir ${c.nome} e todos os dados dele? Não dá para desfazer.`)) { await api('DELETE', `/api/clientes/${c.id}`); fechar(); }
        } }, 'Excluir')));
  }

  function abaDividas() {
    const credor = h('input', { placeholder: 'Credor (banco, loja...)' }), valor = h('input', { type: 'number', min: 0, step: '0.01', placeholder: 'Valor' });
    const total = c.dividas.reduce((s, d) => s + d.valor, 0);
    return h('div', {},
      h('table', {}, h('thead', {}, h('tr', {}, ['Credor', 'Valor', 'Status', ''].map((x) => h('th', {}, x)))),
        h('tbody', {}, c.dividas.map((d) => h('tr', {}, h('td', {}, d.credor), h('td', {}, brl(d.valor)),
          h('td', {}, h('select', { onchange: async (e) => { await api('PATCH', `/api/dividas/${d.id}`, { status: e.target.value }); recarregar(); } },
            STATUS.map((s) => h('option', { value: s, selected: s === d.status }, s)))),
          h('td', {}, h('button', { class: 'link danger', onclick: async () => { await api('DELETE', `/api/dividas/${d.id}`); recarregar(); } }, 'remover')))))),
      h('p', { class: 'mut' }, `Total: ${brl(total)}`),
      h('div', { class: 'row' }, credor, valor, h('button', { class: 'p', onclick: async () => {
        try { await api('POST', `/api/clientes/${c.id}/dividas`, { credor: credor.value, valor: valor.value }); recarregar(); } catch (e) { alert(e.message); }
      } }, 'Adicionar')));
  }

  function abaParcelas() {
    const qtd = h('input', { type: 'number', min: 1, max: 60, value: 6 }), total = h('input', { type: 'number', min: 0, step: '0.01', value: c.valor_servico || '' });
    const ini = h('input', { type: 'date', value: hoje() });
    return h('div', {},
      h('table', {}, h('thead', {}, h('tr', {}, ['#', 'Vencimento', 'Valor', 'Situação', ''].map((x) => h('th', {}, x)))),
        h('tbody', {}, c.parcelas.map((p) => {
          const atrasada = !p.pago && p.vencimento < hoje();
          return h('tr', {}, h('td', {}, p.numero), h('td', {}, data(p.vencimento)), h('td', {}, brl(p.valor)),
            h('td', {}, h('span', { class: 'tag ' + (p.pago ? 'grn' : atrasada ? 'red' : 'amb') }, p.pago ? 'Paga' : atrasada ? 'Em atraso' : 'Aberta')),
            h('td', {}, h('button', { class: 'link', onclick: async () => { await api('PATCH', `/api/parcelas/${p.id}`, { pago: !p.pago }); recarregar(); } }, p.pago ? 'desfazer' : 'marcar paga'),
              h('button', { class: 'link danger', onclick: async () => { await api('DELETE', `/api/parcelas/${p.id}`); recarregar(); } }, 'remover')));
        }))),
      !c.parcelas.length && h('p', { class: 'mut' }, 'Nenhuma parcela. Gere o parcelamento abaixo.'),
      h('div', { class: 'two', style: 'margin-top:12px' }, campo('Valor total (R$)', total), campo('Nº de parcelas', qtd), campo('Primeiro vencimento', ini),
        h('div', { style: 'align-self:end' }, h('button', { class: 'p', onclick: async () => {
          try { await api('POST', `/api/clientes/${c.id}/parcelas`, { total: total.value, quantidade: qtd.value, primeiro_vencimento: ini.value }); recarregar(); } catch (e) { alert(e.message); }
        } }, 'Gerar parcelas'))));
  }

  function abaNotas() {
    const t = h('textarea', { rows: 3, placeholder: 'Registre a conversa, o combinado, o próximo passo...' });
    return h('div', {}, t, h('div', { style: 'margin:8px 0 14px' }, h('button', { class: 'p', onclick: async () => {
      try { await api('POST', `/api/clientes/${c.id}/notas`, { texto: t.value }); recarregar(); } catch (e) { alert(e.message); }
    } }, 'Salvar nota')),
    c.notas.map((n) => h('div', { class: 'card', style: 'cursor:default' }, h('small', {}, n.criado_em), n.texto)),
    !c.notas.length && h('p', { class: 'mut' }, 'Sem notas ainda.'));
  }

  function abaTarefas() {
    const titulo = h('input', { placeholder: 'Ex.: Ligar para confirmar pagamento' }), venc = h('input', { type: 'date', value: hoje() });
    return h('div', {},
      c.tarefas.map((t) => h('div', { class: 'row', style: 'padding:6px 0' },
        h('input', { type: 'checkbox', style: 'width:auto', checked: !!t.feito, onchange: async (e) => { await api('PATCH', `/api/tarefas/${t.id}`, { feito: e.target.checked }); recarregar(); } }),
        h('span', { style: t.feito ? 'text-decoration:line-through;opacity:.6' : '' }, t.titulo), h('span', { class: 'mut' }, data(t.vencimento)))),
      !c.tarefas.length && h('p', { class: 'mut' }, 'Sem tarefas.'),
      h('div', { class: 'row', style: 'margin-top:10px' }, titulo, h('div', { style: 'width:170px' }, venc), h('button', { class: 'p', onclick: async () => {
        try { await api('POST', '/api/tarefas', { titulo: titulo.value, vencimento: venc.value, cliente_id: c.id }); recarregar(); } catch (e) { alert(e.message); }
      } }, 'Adicionar')));
  }

  function desenhar() {
    const abas = c.id ? [['dados', 'Dados'], ['dividas', 'Dívidas'], ['parcelas', 'Parcelas'], ['notas', 'Notas'], ['tarefas', 'Tarefas']] : [['dados', 'Dados']];
    const conteudo = { dados: abaDados, dividas: abaDividas, parcelas: abaParcelas, notas: abaNotas, tarefas: abaTarefas }[aba]();
    box.replaceChildren(
      h('div', { class: 'row' }, h('h2', { style: 'margin:0' }, c.id ? c.nome : 'Novo cliente'), h('div', { class: 'sp' }), h('button', { class: 'link', onclick: fechar }, 'Fechar ✕')),
      h('div', { class: 'tabs' }, abas.map(([k, n]) => h('button', { class: aba === k ? 'on' : '', onclick: () => { aba = k; desenhar(); } }, n))),
      conteudo);
  }
  desenhar();
}

// ---------- tarefas ----------
async function telaTarefas() {
  const lista = await api('GET', '/api/tarefas');
  const titulo = h('input', { placeholder: 'Nova tarefa' }), venc = h('input', { type: 'date', value: hoje() });
  return h('div', {}, h('h2', {}, 'Tarefas'),
    h('div', { class: 'panel' }, lista.map((t) => h('div', { class: 'row', style: 'padding:6px 0' },
      h('input', { type: 'checkbox', style: 'width:auto', checked: !!t.feito, onchange: async (e) => { await api('PATCH', `/api/tarefas/${t.id}`, { feito: e.target.checked }); render(); } }),
      h('span', { style: t.feito ? 'text-decoration:line-through;opacity:.6' : '' }, t.titulo),
      t.cliente_nome && h('span', { class: 'tag' }, t.cliente_nome),
      h('span', { class: !t.feito && t.vencimento && t.vencimento < hoje() ? 'tag red' : 'mut' }, data(t.vencimento)),
      h('div', { class: 'sp' }), h('button', { class: 'link danger', onclick: async () => { await api('DELETE', `/api/tarefas/${t.id}`); render(); } }, 'remover'))),
    !lista.length && h('p', { class: 'mut' }, 'Nenhuma tarefa.')),
    h('div', { class: 'row' }, titulo, h('div', { style: 'width:170px' }, venc), h('button', { class: 'p', onclick: async () => {
      try { await api('POST', '/api/tarefas', { titulo: titulo.value, vencimento: venc.value }); render(); } catch (e) { alert(e.message); }
    } }, 'Adicionar')));
}

// ---------- painel ----------
async function telaPainel() {
  const d = await api('GET', '/api/dashboard');
  const stat = (n, v) => h('div', { class: 'stat' }, h('span', {}, n), h('b', {}, v));
  const max = Math.max(1, ...Object.values(d.por_etapa));
  return h('div', {}, h('h2', {}, 'Painel'),
    h('div', { class: 'grid' }, stat('Clientes', d.clientes), stat('Conversão em venda', d.conversao + '%'), stat('Recebido', brl(d.recebido)),
      stat('A receber', brl(d.a_receber)), stat(`Em atraso (${d.em_atraso.n} parcelas)`, brl(d.em_atraso.v)), stat('Tarefas para hoje ou atrasadas', d.tarefas_hoje)),
    h('div', { class: 'panel' }, h('b', {}, 'Clientes por etapa'),
      Object.entries(d.por_etapa).map(([e, n]) => h('div', { style: 'margin-top:10px' }, h('div', { class: 'row' }, h('span', {}, ROTULOS[e]), h('div', { class: 'sp' }), h('span', { class: 'mut' }, n)),
        h('div', { class: 'bar' }, h('i', { style: `width:${(n / max) * 100}%` }))))),
    h('div', { class: 'panel' }, h('b', {}, 'Origem dos leads'),
      d.origens.length ? h('table', {}, h('tbody', {}, d.origens.map((o) => h('tr', {}, h('td', {}, o.origem), h('td', {}, o.n))))) : h('p', { class: 'mut' }, 'Sem dados ainda.')));
}

async function iniciar() {
  try { estado.me = await api('GET', '/api/me'); } catch { estado.me = null; }
  render();
}
iniciar();
