import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface Configuracoes {
  chavePix?: string;
  nomeRecebedorPix?: string;
  cidadeRecebedorPix?: string;
  modeloContratoBase64?: string;
  modeloContratoNome?: string;
  avisoEstouIndo?: string;
  avisoCuidadosPosMontagem?: string;
  avisoAtraso?: string;
  avisosPersonalizados?: AvisoPersonalizado[];
  atualizadoEm?: number;
}

export interface AvisoPersonalizado {
  id: string;
  titulo: string;
  texto: string;
}

const CAMINHO = 'configuracoes/geral';

export function ouvirConfiguracoes(callback: (config: Configuracoes) => void) {
  return onSnapshot(doc(getFirebaseDb(), CAMINHO), (snap) => {
    callback((snap.data() as Configuracoes) ?? {});
  });
}

export async function salvarConfiguracoes(dados: Partial<Configuracoes>): Promise<void> {
  await setDoc(doc(getFirebaseDb(), CAMINHO), { ...dados, atualizadoEm: Date.now() }, { merge: true });
}
