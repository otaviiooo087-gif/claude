import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { todayISO } from './format';

export interface PontoTrajeto {
  lat: number;
  lng: number;
  criadoEm: number;
}

export async function buscarTrajetoDoDia(uid: string, dataISO: string = todayISO()): Promise<PontoTrajeto[]> {
  const q = query(collection(getFirebaseDb(), 'localizacoes', uid, 'rota'), where('data', '==', dataISO));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as PontoTrajeto)
    .sort((a, b) => a.criadoEm - b.criadoEm);
}
