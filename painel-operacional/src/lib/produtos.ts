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

export interface Produto {
  id: string;
  nome: string;
  cor: string; // hex, ex: #22c55e — pra identificar o brinquedo de longe
  imagemUrl?: string;
  itens: string[]; // cada peça que compõe o brinquedo (motor, lona, extensão, estacas...)
  criadoEm: number;
}

export type ProdutoDraft = Omit<Produto, 'id' | 'criadoEm'>;

const COLECAO = 'brinquedos';

export function ouvirProdutos(callback: (produtos: Produto[]) => void) {
  const q = query(collection(getFirebaseDb(), COLECAO), orderBy('nome', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Produto));
  });
}

export async function criarProduto(dados: ProdutoDraft): Promise<void> {
  await addDoc(collection(getFirebaseDb(), COLECAO), { ...dados, criadoEm: Date.now() });
}

export async function atualizarProduto(id: string, dados: Partial<ProdutoDraft>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLECAO, id), dados);
}

export async function excluirProduto(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLECAO, id));
}
