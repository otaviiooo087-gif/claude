import { collection, deleteDoc, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Contrato, nomesDosItens } from './contracts';
import { Produto } from './produtos';
import { ChecklistItem, Task } from './types';
import { formatCurrency } from './format';
import { atribuirTarefas, excluirTarefaAtribuida } from './tarefasAtribuidas';

const COLECAO = 'logisticaContratos';

export interface LogisticaContrato {
  contratoId: string;
  cliente: string;
  dataEvento: string;
  tarefas: Task[]; // montagem + retirada, prontas para atribuir
  atribuidas: Record<string, { uid: string; nome: string }>; // taskId -> operador
  origem: 'assinatura' | 'manual';
  geradaEm: number;
}

export const idMontagem = (contratoId: string) => `contrato-${contratoId}-montagem`;
export const idRetirada = (contratoId: string) => `contrato-${contratoId}-retirada`;

/** Monta a logística completa do contrato: MONTAGEM no horário de início e RETIRADA no horário de término, com o checklist de todas as peças. */
export function gerarTarefasDoContrato(c: Contrato, produtos: Produto[]): Task[] {
  const nomes = nomesDosItens(c);
  const varios = nomes.length > 1;
  const checklist = (prefixo: string): ChecklistItem[] => {
    const itens: ChecklistItem[] = [];
    nomes.forEach((nome) => {
      const produto = produtos.find((p) => p.nome.trim().toLowerCase() === nome.trim().toLowerCase());
      produto?.itens.forEach((peca) =>
        itens.push({ id: `${prefixo}-${itens.length}`, texto: varios ? `${nome}: ${peca}` : peca, marcado: false })
      );
    });
    return itens;
  };

  const base = {
    data: c.dataEvento,
    cliente: c.cliente,
    telefone: c.telefone,
    endereco: c.endereco,
    brinquedo: nomes.join(' + '),
    status: 'PENDENTE' as const,
    ordem: 0,
    createdAt: Date.now(),
  };
  const inicio = c.horarioInicio || '';
  const termino = c.horarioTermino || '';

  const montagem: Task = {
    ...base,
    id: idMontagem(c.id),
    tipo: 'MONTAGEM',
    horario: inicio || 'A combinar',
    horarioComparacao: inicio || '00:00',
    valor: c.valorChegada,
    observacoes: [
      `Cobrar na chegada, antes de montar: ${formatCurrency(c.valorChegada)} (sinal de ${formatCurrency(c.valorSinal)} já pago).`,
      c.observacoes,
    ]
      .filter(Boolean)
      .join(' '),
    checklist: checklist('m'),
  };
  const retirada: Task = {
    ...base,
    id: idRetirada(c.id),
    tipo: 'RETIRADA',
    horario: termino || 'A combinar',
    horarioComparacao: termino || '23:59',
    observacoes: 'Conferir todas as peças do checklist antes de sair.',
    checklist: checklist('r'),
  };
  return [montagem, retirada];
}

export function ouvirLogisticaContratos(callback: (lista: Record<string, LogisticaContrato>) => void) {
  return onSnapshot(collection(getFirebaseDb(), COLECAO), (snap) => {
    const mapa: Record<string, LogisticaContrato> = {};
    snap.docs.forEach((d) => (mapa[d.id] = d.data() as LogisticaContrato));
    callback(mapa);
  });
}

export async function salvarLogisticaContrato(
  c: Contrato,
  produtos: Produto[],
  origem: LogisticaContrato['origem']
): Promise<void> {
  const dados: LogisticaContrato = {
    contratoId: c.id,
    cliente: c.cliente,
    dataEvento: c.dataEvento,
    tarefas: gerarTarefasDoContrato(c, produtos),
    atribuidas: {},
    origem,
    geradaEm: Date.now(),
  };
  await setDoc(doc(getFirebaseDb(), COLECAO, c.id), dados);
}

export async function excluirLogisticaContrato(contratoId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLECAO, contratoId));
}

/** Envia a tarefa ao operador e registra no planejamento quem ficou com ela. */
export async function atribuirTarefaDoContrato(
  contratoId: string,
  tarefa: Task,
  operador: { uid: string; nome: string }
): Promise<void> {
  await atribuirTarefas(operador.uid, [tarefa]);
  await updateDoc(doc(getFirebaseDb(), COLECAO, contratoId), { [`atribuidas.${tarefa.id}`]: operador });
}

/** Guarda a lista de tarefas editada (data, horário, endereço...) enquanto ainda não foram atribuídas. */
export async function atualizarTarefasPlanejadas(contratoId: string, tarefas: Task[]): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLECAO, contratoId), { tarefas });
}

/** Tira o operador de uma tarefa: some da agenda dele e volta a ficar "sem operador" no planejamento. */
export async function desatribuirTarefaDoContrato(contratoId: string, taskId: string, operadorUid: string): Promise<void> {
  await excluirTarefaAtribuida(operadorUid, taskId);
  await updateDoc(doc(getFirebaseDb(), COLECAO, contratoId), { [`atribuidas.${taskId}`]: deleteField() });
}

/** Remove o contrato do planejamento, inclusive as tarefas que já estavam na agenda dos operadores. */
export async function excluirLogisticaCompleta(l: LogisticaContrato, operadorUidPorTarefa: Record<string, string>): Promise<void> {
  for (const t of l.tarefas) {
    const uid = operadorUidPorTarefa[t.id] ?? l.atribuidas[t.id]?.uid;
    if (uid) await excluirTarefaAtribuida(uid, t.id).catch(() => {});
  }
  await deleteDoc(doc(getFirebaseDb(), COLECAO, l.contratoId));
}
