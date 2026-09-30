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
  motivoLembrete?: string; // ex: "aniversário do João", "1 ano de casados", "formatura da Maria"
  dataLembrete?: string; // YYYY-MM-DD (o ano é ignorado nos lembretes, só dia/mês importam)
  valorSinal: number;
  valorChegada: number;
  status: ContratoStatus;
  observacoes?: string;
  contratoAssinadoBase64?: string;
  contratoAssinadoNome?: string;
  itens?: ItemContrato[]; // brinquedos escolhidos, cada um com o peso suportado
  horarioInicio?: string; // HH:MM início da montagem
  horarioTermino?: string; // HH:MM término
  valorTotal?: number; // total acordado; valorChegada = total - sinal
  linkCurto?: string; // link encurtado (zimbafestas_nome_xxxx) enviado ao cliente
  tokenAssinatura?: string; // link público de assinatura (contratosPublicos/{token})
  criadoEm: number;
}

export interface ItemContrato {
  nome: string;
  peso: string;
}

/** Nomes dos brinquedos do contrato (usa a lista de itens; contratos antigos têm só o texto `brinquedo`). */
export function nomesDosItens(c: Pick<Contrato, 'itens' | 'brinquedo'>): string[] {
  if (c.itens && c.itens.length > 0) return c.itens.map((i) => i.nome);
  return c.brinquedo ? [c.brinquedo] : [];
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
