import { Task, TaskType } from './types';

// Interpreta o texto de logística exatamente no formato que o Matheus manda
// (o mesmo padrão observado nos roteiros já recebidos): um cabeçalho de data
// por dia, uma lista de tarefas com horário(s) + descrição + ENDEREÇO: +
// TELEFONE:, e uma seção "RETIRADAS:" com os horários de retirada.
//
// O resultado é sempre um RASCUNHO: cada campo pode ser editado na tela de
// importação antes de salvar. Isso é proposital — o texto varia o bastante
// (parênteses, horários múltiplos, abreviações) para que um parser 100%
// automático arriscasse gravar dado errado numa agenda real sem o usuário
// perceber.

export interface TaskDraft {
  data: string;
  horario: string;
  horarioComparacao: string;
  tipo: TaskType;
  cliente: string;
  telefone?: string;
  endereco?: string;
  brinquedo?: string;
  valor?: string;
  observacoes?: string;
  precisaRevisao: boolean;
}

const MESES: Record<string, string> = {
  JANEIRO: '01',
  FEVEREIRO: '02',
  MARÇO: '03',
  MARCO: '03',
  ABRIL: '04',
  MAIO: '05',
  JUNHO: '06',
  JULHO: '07',
  AGOSTO: '08',
  SETEMBRO: '09',
  OUTUBRO: '10',
  NOVEMBRO: '11',
  DEZEMBRO: '12',
};

const PALAVRAS_LOGISTICA = [
  'BUSCAR',
  'ALMOÇO',
  'ALMOCO',
  'ALMOÇAR',
  'DESCARREGAR',
  'CARREGAR',
  'COMER',
  'VOLTAR',
  'LEVAR',
];

const TIME_RE = /^\d{1,2}:\d{2}(\/\d{1,2}:\d{2})?$/;
const CONECTORES = new Set(['-', '–', '/', 'ATÉ', 'ATE']);

function isTimeToken(token: string): boolean {
  return TIME_RE.test(token);
}

function normalizarConectores(linha: string): string {
  return linha
    .replace(/–/g, ' – ')
    .replace(/(\d{1,2}:\d{2})-/g, '$1 - ')
    .replace(/-(\d{1,2}:\d{2})/g, ' - $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function normalizarTelefone(linha: string): string | undefined {
  const m = linha.match(/(\d{2})\D{0,3}(\d{4,5})[\s-]?(\d{4})/);
  if (!m) return undefined;
  return `${m[1]} ${m[2]}-${m[3]}`;
}

function detectarData(linha: string, anoPadrao: number): string | null {
  const semAcento = linha.toUpperCase().trim();
  let m = semAcento.match(/^(\d{1,2})\s*DE\s*([A-ZÇÃÕ]+)(?:\s*DE\s*(\d{4}))?$/);
  if (m) {
    const dia = m[1].padStart(2, '0');
    const mes = MESES[m[2]];
    if (!mes) return null;
    const ano = m[3] || String(anoPadrao);
    return `${ano}-${mes}-${dia}`;
  }
  m = semAcento.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    const dia = m[1].padStart(2, '0');
    const mes = m[2].padStart(2, '0');
    const ano = m[3] || String(anoPadrao);
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

function ehLinhaDeAtividadeSolta(linha: string): boolean {
  if (!/^[A-ZÀ-Ú ]{2,30}$/.test(linha)) return false;
  const palavras = linha.split(/\s+/);
  return palavras.some((p) => PALAVRAS_LOGISTICA.includes(p));
}

interface EntradaBruta {
  linhas: string[];
  data: string;
  isRetirada: boolean;
}

export function parseLogistica(textoOriginal: string, anoPadrao = new Date().getFullYear()): TaskDraft[] {
  const linhas = textoOriginal
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entradas: EntradaBruta[] = [];
  let dataAtual = '';
  let isRetirada = false;
  let entradaAtual: string[] | null = null;

  function fechaEntrada() {
    if (entradaAtual && entradaAtual.length > 0 && dataAtual) {
      entradas.push({ linhas: entradaAtual, data: dataAtual, isRetirada });
    }
    entradaAtual = null;
  }

  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal;
    const dataDetectada = detectarData(linha, anoPadrao);
    if (dataDetectada) {
      fechaEntrada();
      dataAtual = dataDetectada;
      isRetirada = false;
      continue;
    }

    if (/^RETIRADAS:?$/i.test(linha)) {
      fechaEntrada();
      isRetirada = true;
      continue;
    }

    // Linha solta de buffer/deslocamento (ex: "30 MIN") não é uma tarefa.
    if (/^\d{1,3}\s*MIN$/i.test(linha)) {
      continue;
    }

    const primeiroToken = linha.split(/\s+/)[0] || '';
    const comecaComHorario = isTimeToken(primeiroToken);

    if (comecaComHorario) {
      fechaEntrada();
      entradaAtual = [linha];
    } else if (ehLinhaDeAtividadeSolta(linha)) {
      // Ex: "COMER" sozinho numa linha, sem horário — é uma tarefa nova,
      // não continuação da anterior.
      fechaEntrada();
      entradaAtual = [linha];
    } else if (entradaAtual) {
      entradaAtual.push(linha);
    }
    // Linhas antes da primeira tarefa reconhecida de um dia são ignoradas.
  }
  fechaEntrada();

  const rascunhos: TaskDraft[] = entradas.map((entrada) => {
    // O "cabeçalho" (horário + atividade + cliente) às vezes quebra em
    // mais de uma linha no texto original, antes da primeira linha
    // rotulada (ENDEREÇO:/TELEFONE:/LOCAL DA MONTAGEM:). Junta tudo isso
    // numa string só antes de extrair horário/cliente/brinquedo.
    const ehLinhaRotulada = (l: string) => /ENDEREÇO|ENDERECO|^TELEFONE|LOCAL DA MONTAGEM/i.test(l);
    let fimCabecalho = 1;
    while (fimCabecalho < entrada.linhas.length && !ehLinhaRotulada(entrada.linhas[fimCabecalho])) {
      fimCabecalho++;
    }
    const primeiraLinha = normalizarConectores(entrada.linhas.slice(0, fimCabecalho).join(' '));
    const outrasLinhas = entrada.linhas.slice(fimCabecalho);

    const tokens = primeiraLinha.split(/\s+/);
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (isTimeToken(t) || CONECTORES.has(t.toUpperCase())) {
        i++;
      } else {
        break;
      }
    }
    const horarioTokens = tokens.slice(0, i);
    const horarioBruto = horarioTokens.join(' ').replace(/[\s\-–/]+$/, '').trim();
    const ehIntervalo = /\/|ATÉ|ATE/i.test(horarioTokens.join(' '));

    // Horários podem aparecer não só no início da linha (ex: "chegada -
    // horário do evento - retirada"), mas também embutidos no meio, quando
    // o texto do item vem antes do último horário. Por isso procuramos
    // TODOS os horários da linha, não só os do início.
    const todosHorarios = (primeiraLinha.match(/\d{1,2}:\d{2}/g) || []).map((h) => h.padStart(5, '0'));

    // Remove do texto qualquer sequência de horário(s)+conectores (início
    // ou meio da linha), substituindo por um único "-" para preservar a
    // separação entre os pedaços de texto ao redor.
    const restTokens: string[] = [];
    let j = 0;
    let removeuAlgumNoMeio = false;
    while (j < tokens.length) {
      if (isTimeToken(tokens[j])) {
        // consome a sequência de horários/conectores
        let k = j;
        while (k < tokens.length && (isTimeToken(tokens[k]) || CONECTORES.has(tokens[k].toUpperCase()))) {
          k++;
        }
        if (j > 0) removeuAlgumNoMeio = true;
        if (restTokens.length > 0 && restTokens[restTokens.length - 1] !== '-') {
          restTokens.push('-');
        }
        j = k;
      } else {
        restTokens.push(tokens[j]);
        j++;
      }
    }
    let rest = restTokens.join(' ').replace(/^[\s\-–/]+/, '').replace(/[\s\-–/]+$/, '').trim();
    void removeuAlgumNoMeio;

    let horario = '';
    let horarioComparacao = '';
    const notasHorario: string[] = [];

    if (todosHorarios.length === 0) {
      horario = '';
      horarioComparacao = '';
    } else if (ehIntervalo || todosHorarios.length === 1) {
      horario = horarioBruto || todosHorarios[0];
      horarioComparacao = todosHorarios[0];
      if (todosHorarios.length > 1) {
        // ex: horário único no rótulo, mas outro horário apareceu embutido
        // no meio do texto (caso raro) — registra como nota.
        for (let h = 1; h < todosHorarios.length; h++) {
          notasHorario.push(`Outro horário mencionado no texto original: ${todosHorarios[h]}.`);
        }
      }
    } else {
      horario = todosHorarios[0];
      horarioComparacao = todosHorarios[0];
      if (todosHorarios.length === 3) {
        notasHorario.push(`Evento do cliente começa às ${todosHorarios[1]}.`);
        notasHorario.push(`Retirada agendada para ${todosHorarios[2]}.`);
      } else if (todosHorarios.length === 2) {
        notasHorario.push(`Retirada agendada para ${todosHorarios[1]}.`);
      }
    }

    // Nota de tempo estimado colada no fim da linha (ex: "... 36 MIN").
    const bufferMatch = rest.match(/\s+(\d{1,3})\s*MIN$/i);
    if (bufferMatch) {
      notasHorario.push(`Tempo estimado até aqui: ${bufferMatch[1]} min.`);
      rest = rest.slice(0, bufferMatch.index).trim();
    }

    // Parênteses (às vezes sem fechamento no texto original) viram
    // observação à parte, nunca ficam soltos quebrando o resto do texto.
    const abre = (rest.match(/\(/g) || []).length;
    const fecha = (rest.match(/\)/g) || []).length;
    if (abre > fecha) rest = rest + ')'.repeat(abre - fecha);
    const parenteses: string[] = [];
    rest = rest
      .replace(/\(([^)]*)\)/g, (_, p1) => {
        if (p1.trim()) parenteses.push(p1.trim());
        return '';
      })
      .replace(/\s{2,}/g, ' ')
      .trim();

    const segmentos = rest
      .split(/\s+-\s+/)
      .map((s) => s.replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim())
      .filter(Boolean);

    let cliente = rest.replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
    let brinquedo: string | undefined;
    if (segmentos.length > 1) {
      cliente = segmentos[segmentos.length - 1];
      brinquedo = segmentos.slice(0, -1).join(' - ');
    }
    cliente = cliente.replace(/^(NOME DO CONTRATANTE|CONTRATANTE|NOME)\s*:\s*/i, '').trim();
    if (!cliente) cliente = rest || '(revisar)';

    let endereco: string | undefined;
    let telefone: string | undefined;
    const obsExtra: string[] = [...notasHorario, ...parenteses];
    let esperandoContinuacaoEndereco = false;

    for (const linhaOutra of outrasLinhas) {
      const upper = linhaOutra.toUpperCase();
      const temEndereco = /ENDEREÇO|ENDERECO/.test(upper);
      const temTelefone = upper.startsWith('TELEFONE') || /\bTELEFONE\s*:/.test(upper);

      if (temEndereco) {
        const idx = linhaOutra.search(/ENDEREÇO|ENDERECO/i);
        const depoisDoisPontos = linhaOutra.slice(idx).replace(/^(ENDEREÇO|ENDERECO)\s*:?\s*/i, '');
        const antes = linhaOutra.slice(0, idx).trim();
        endereco = [antes, depoisDoisPontos].filter(Boolean).join(' ').trim();
        esperandoContinuacaoEndereco = true;
      } else if (temTelefone) {
        const tel = normalizarTelefone(linhaOutra);
        if (tel && !telefone) telefone = tel;
        const resto = linhaOutra
          .replace(/^[^:]*TELEFONE\s*:\s*/i, '')
          .replace(/\d{2}\D{0,3}\d{4,5}[\s-]?\d{4}/, '')
          .trim();
        if (resto) obsExtra.push(resto.replace(/^[()\s-]+|[()\s]+$/g, ''));
        esperandoContinuacaoEndereco = false;
      } else if (/^LOCAL DA MONTAGEM/i.test(linhaOutra)) {
        obsExtra.push(linhaOutra);
        esperandoContinuacaoEndereco = false;
      } else if (esperandoContinuacaoEndereco) {
        // Linha de continuação do endereço (quebrou em duas linhas no texto).
        endereco = `${(endereco || '').replace(/,\s*$/, '')}, ${linhaOutra}`;
        esperandoContinuacaoEndereco = false;
      } else {
        obsExtra.push(linhaOutra);
      }
    }

    // Às vezes o telefone aparece solto no meio do texto (ex: "CONTATO COM
    // TALLES 16 99114-7728"), sem um rótulo "TELEFONE:". Se nada foi
    // encontrado via rótulo, tenta achar um número em qualquer lugar.
    if (!telefone) {
      telefone = normalizarTelefone(`${primeiraLinha} ${outrasLinhas.join(' ')}`);
    }

    const textoCompleto = `${primeiraLinha} ${outrasLinhas.join(' ')}`.toUpperCase();
    const temPalavraLogistica = PALAVRAS_LOGISTICA.some((p) =>
      textoCompleto.split(/[^A-ZÀ-Ú]+/).includes(p)
    );

    let tipo: TaskType;
    if (!endereco && !telefone && temPalavraLogistica) {
      tipo = 'LOGISTICA';
    } else if (entrada.isRetirada) {
      tipo = 'RETIRADA';
    } else if (textoCompleto.includes('SESI') || /\bEVENTO\b/.test(textoCompleto)) {
      tipo = 'EVENTO';
    } else if (endereco) {
      tipo = 'MONTAGEM';
    } else {
      tipo = 'LOGISTICA';
    }

    const observacoes = obsExtra.filter(Boolean).join(' ') || undefined;

    return {
      data: entrada.data,
      horario,
      horarioComparacao,
      tipo,
      cliente,
      telefone,
      endereco,
      brinquedo,
      observacoes,
      precisaRevisao:
        !horarioComparacao ||
        !cliente ||
        cliente === '(revisar)' ||
        (!!endereco && endereco.length > 120 && !/\bSP\b|\bCAMPINAS\b|\bVALINHOS\b/i.test(endereco)),
    };
  });

  // Preenche horário de entradas sem horário (ex: "COMER") com base na
  // tarefa anterior da mesma data, e ordena tudo cronologicamente por dia.
  const porData = new Map<string, TaskDraft[]>();
  for (const r of rascunhos) {
    if (!porData.has(r.data)) porData.set(r.data, []);
    porData.get(r.data)!.push(r);
  }

  const resultadoFinal: TaskDraft[] = [];
  for (const [, lista] of porData) {
    let ultimoHorario = '';
    for (const r of lista) {
      if (!r.horarioComparacao && ultimoHorario) {
        r.horario = `Após ${ultimoHorario}`;
        r.horarioComparacao = ultimoHorario;
        r.precisaRevisao = true;
      }
      if (r.horarioComparacao) ultimoHorario = r.horarioComparacao;
    }
    lista.sort((a, b) => minutos(a.horarioComparacao || '00:00') - minutos(b.horarioComparacao || '00:00'));
    resultadoFinal.push(...lista);
  }

  return resultadoFinal;
}

export function draftsParaTasks(drafts: TaskDraft[], existentes: Task[]): Task[] {
  const porData = new Map<string, number>();
  for (const t of existentes) {
    porData.set(t.data, Math.max(porData.get(t.data) || 0, t.ordem));
  }

  return drafts.map((d, idx) => {
    const ordemBase = porData.get(d.data) || 0;
    porData.set(d.data, ordemBase + 1);
    return {
      id: `import-${Date.now()}-${idx}`,
      data: d.data,
      horario: d.horario || 'Sem horário definido',
      horarioComparacao: d.horarioComparacao || '00:00',
      tipo: d.tipo,
      cliente: d.cliente,
      telefone: d.telefone || undefined,
      endereco: d.endereco || undefined,
      brinquedo: d.brinquedo || undefined,
      valor: d.valor ? parseFloat(d.valor.replace(',', '.')) || undefined : undefined,
      observacoes: d.observacoes || undefined,
      checklist: [],
      status: 'PENDENTE',
      ordem: ordemBase + 1,
      createdAt: Date.now(),
    };
  });
}
