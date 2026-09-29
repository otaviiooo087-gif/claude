import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Task } from './types';

export interface RegistroProdutividade {
  id: string;
  operadorUid: string;
  operadorNome: string;
  taskId: string;
  cliente: string;
  tipo: string;
  data: string;
  tempoDeslocamentoMin: number | null;
  tempoMontagemMin: number | null;
  concluidaEm: number;
}

function calcularMinutos(inicio?: number, fim?: number): number | null {
  if (!inicio || !fim || fim <= inicio) return null;
  return Math.round((fim - inicio) / 60000);
}

/** Registra, ao concluir uma tarefa, quanto tempo levou o deslocamento e a montagem/execução. */
export async function registrarProdutividade(uid: string, nome: string, task: Task): Promise<void> {
  if (!task.completedAt) return;
  const h = task.statusHistorico || {};
  const registro: Omit<RegistroProdutividade, 'id'> = {
    operadorUid: uid,
    operadorNome: nome,
    taskId: task.id,
    cliente: task.cliente,
    tipo: task.tipo,
    data: task.data,
    tempoDeslocamentoMin: calcularMinutos(h.EM_DESLOCAMENTO, h.CHEGUEI),
    tempoMontagemMin: calcularMinutos(h.CHEGUEI ?? h.EM_EXECUCAO, task.completedAt),
    concluidaEm: task.completedAt,
  };
  await setDoc(doc(getFirebaseDb(), 'produtividade', `${uid}_${task.id}`), registro);
}

export function ouvirProdutividadeDoDia(dataISO: string, callback: (registros: RegistroProdutividade[]) => void) {
  const q = query(collection(getFirebaseDb(), 'produtividade'), where('data', '==', dataISO));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistroProdutividade));
  });
}
