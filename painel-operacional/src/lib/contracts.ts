import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export type ContratoStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface Contrato {
  id: string;
  cliente: string; // nome completo do contratante
  cpf?: string;
  dataNascimento?: string; // YYYY-MM-DD
  telefone?: string;
  brinquedo: string;
  dataEvento: string; // YYYY-MM-DD
  endereco?: string;
  valorSinal: number;
  valorChegada: number;
  status: ContratoStatus;
  observacoes?: string;
  criadoEm: number;
}

export type ContratoDraft = Omit<Contrato, 'id' | 'criadoEm'>;

const COLECAO = 'contratos';

export function ouvirContratos(callback: (contratos: Contrato[]) => void) {
  const q = query(collection(getFirebaseDb(), COLECAO), orderBy('dataEvento', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contrato));
  });
}

export async function criarContrato(dados: ContratoDraft): Promise<void> {
  await addDoc(collection(getFirebaseDb(), COLECAO), { ...dados, criadoEm: Date.now() });
}

export async function atualizarContrato(id: string, dados: Partial<ContratoDraft>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLECAO, id), dados);
}

export async function excluirContrato(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLECAO, id));
}
