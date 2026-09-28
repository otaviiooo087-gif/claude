import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
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
