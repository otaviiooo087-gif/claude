import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export async function buscarFechamentoDia(data: string): Promise<string | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'fechamentosDia', data));
  return snap.exists() ? ((snap.data().horario as string) ?? null) : null;
}

export async function salvarFechamentoDia(data: string, horario: string): Promise<void> {
  await setDoc(doc(getFirebaseDb(), 'fechamentosDia', data), { horario });
}
