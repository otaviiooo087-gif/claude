import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface Emergencia {
  id: string;
  operadorUid: string;
  operadorNome: string;
  criadoEm: number;
  resolvida: boolean;
}

export async function dispararEmergencia(uid: string, nome: string): Promise<void> {
  await addDoc(collection(getFirebaseDb(), 'emergencias'), {
    operadorUid: uid,
    operadorNome: nome,
    criadoEm: Date.now(),
    resolvida: false,
  });
}

export function ouvirEmergenciasAbertas(callback: (emergencias: Emergencia[]) => void) {
  const q = query(collection(getFirebaseDb(), 'emergencias'), where('resolvida', '==', false));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Emergencia));
  });
}

export async function resolverEmergencia(id: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'emergencias', id), { resolvida: true });
}
