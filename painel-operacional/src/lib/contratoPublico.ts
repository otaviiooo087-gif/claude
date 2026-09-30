import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Contrato, ItemContrato, nomesDosItens } from './contracts';

const COLECAO = 'contratosPublicos';

export interface AssinaturaContrato {
  nome: string;
  documento: string; // CPF/CNPJ digitado pelo cliente
  imagem: string; // data URL PNG do desenho da assinatura
  em: number;
}

/** Cópia do contrato que o cliente enxerga pelo link (o token é o segredo). */
export interface ContratoPublico {
  contratoId: string;
  cliente: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  itens: ItemContrato[];
  dataEvento: string;
  horarioInicio?: string;
  horarioTermino?: string;
  valorTotal: number;
  valorSinal: number;
  valorChegada: number;
  criadoEm: number;
  assinatura?: AssinaturaContrato;
  assinadoEm?: number;
}

export function gerarToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function montarPublico(c: Contrato): Omit<ContratoPublico, 'assinatura' | 'assinadoEm'> {
  const itens =
    c.itens && c.itens.length > 0 ? c.itens : nomesDosItens(c).map((nome) => ({ nome, peso: '' }));
  return {
    contratoId: c.id,
    cliente: c.cliente,
    cpf: c.cpf,
    telefone: c.telefone,
    endereco: c.endereco,
    itens,
    dataEvento: c.dataEvento,
    horarioInicio: c.horarioInicio,
    horarioTermino: c.horarioTermino,
    valorTotal: c.valorTotal ?? c.valorSinal + c.valorChegada,
    valorSinal: c.valorSinal,
    valorChegada: c.valorChegada,
    criadoEm: Date.now(),
  };
}

/** Cria/atualiza o documento público. Se já foi assinado, não mexe (a assinatura vale sobre aquela versão). */
export async function publicarContrato(c: Contrato, token: string): Promise<void> {
  await setDoc(doc(getFirebaseDb(), COLECAO, token), montarPublico(c));
}

export async function buscarContratoPublico(token: string): Promise<ContratoPublico | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLECAO, token));
  return snap.exists() ? (snap.data() as ContratoPublico) : null;
}

export async function assinarContrato(token: string, assinatura: AssinaturaContrato): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLECAO, token), { assinatura, assinadoEm: assinatura.em });
}

export async function removerContratoPublico(token: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLECAO, token));
}

/** Admin: mapa token -> data da assinatura, pra mostrar "assinado" nos cards. */
export function ouvirAssinaturas(callback: (assinados: Record<string, number>) => void) {
  return onSnapshot(collection(getFirebaseDb(), COLECAO), (snap) => {
    const mapa: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const em = (d.data() as ContratoPublico).assinadoEm;
      if (em) mapa[d.id] = em;
    });
    callback(mapa);
  });
}

/** Link absoluto da página pública de assinatura. Usa o domínio oficial (se configurado) em vez do endereço em que o admin abriu o app. */
export function linkAssinatura(token: string): string {
  const oficial = process.env.NEXT_PUBLIC_DOMINIO_PUBLICO?.replace(/\/$/, '');
  if (oficial) return `${oficial}/assinar/?t=${token}`;
  const base = window.location.pathname.split('/admin')[0].replace(/\/$/, '');
  return `${window.location.origin}${base}/assinar/?t=${token}`;
}
