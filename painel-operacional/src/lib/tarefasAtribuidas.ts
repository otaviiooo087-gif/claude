import { collection, collectionGroup, deleteDoc, doc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Task } from './types';

// Cada operador tem sua própria subcoleção — assim ele só consegue ler
// (via regra do Firestore) as tarefas atribuídas a ele mesmo, e o admin
// consegue ler/escrever em qualquer uma pra atribuir e acompanhar.
function colecaoDoOperador(operadorUid: string) {
  return collection(getFirebaseDb(), 'tarefasAtribuidas', operadorUid, 'itens');
}

export async function atribuirTarefas(operadorUid: string, tarefas: Task[]): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const colecao = colecaoDoOperador(operadorUid);
  tarefas.forEach((tarefa) => batch.set(doc(colecao, tarefa.id), tarefa));
  await batch.commit();
}

/** Busca uma vez (não fica ouvindo) as tarefas atribuídas a esse operador. */
export async function buscarTarefasAtribuidas(operadorUid: string): Promise<Task[]> {
  const snap = await getDocs(colecaoDoOperador(operadorUid));
  return snap.docs.map((d) => d.data() as Task);
}

/** Fica ouvindo, em tempo real, as tarefas atribuídas a esse operador. */
export function ouvirTarefasAtribuidas(operadorUid: string, callback: (tarefas: Task[]) => void) {
  return onSnapshot(colecaoDoOperador(operadorUid), (snap) => {
    callback(snap.docs.map((d) => d.data() as Task));
  });
}

export interface TarefaComOperador {
  uid: string;
  task: Task;
}

/** Visão do admin: todas as tarefas atribuídas, de todos os operadores, em tempo real. */
export function ouvirTodasTarefasAtribuidas(callback: (tarefas: TarefaComOperador[]) => void) {
  return onSnapshot(collectionGroup(getFirebaseDb(), 'itens'), (snap) => {
    const lista = snap.docs
      .filter((d) => d.ref.parent.parent?.parent.id === 'tarefasAtribuidas')
      .map((d) => ({ uid: d.ref.parent.parent!.id, task: d.data() as Task }));
    callback(lista);
  });
}

export async function atualizarTarefaAtribuida(operadorUid: string, tarefa: Task): Promise<void> {
  await setDoc(doc(colecaoDoOperador(operadorUid), tarefa.id), tarefa);
}

export async function excluirTarefaAtribuida(operadorUid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(colecaoDoOperador(operadorUid), taskId));
}

/** Move a tarefa da subcoleção de um operador pra de outro. */
export async function reatribuirTarefa(uidAntigo: string, uidNovo: string, tarefa: Task): Promise<void> {
  await setDoc(doc(colecaoDoOperador(uidNovo), tarefa.id), tarefa);
  if (uidAntigo !== uidNovo) await deleteDoc(doc(colecaoDoOperador(uidAntigo), tarefa.id));
}
