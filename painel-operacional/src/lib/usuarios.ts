import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { UserProfile } from './authTypes';

export async function listarUsuarios(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'usuarios'));
  return snap.docs.map((d) => d.data() as UserProfile);
}

/**
 * Remove o acesso da pessoa ao app: apaga o perfil (é ele que libera o uso) e
 * a última localização dela do mapa. O login em si continua existindo no
 * Firebase Authentication — apagar a conta de outra pessoa exige servidor
 * próprio (plano pago); sem perfil, o app bloqueia a entrada.
 */
export async function excluirUsuario(uid: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'usuarios', uid));
  try {
    await deleteDoc(doc(getFirebaseDb(), 'localizacoes', uid));
  } catch {
    // sem permissão nas regras antigas: o perfil já foi removido, o que importa
  }
}

/** Manda pro e-mail da pessoa o link do Firebase pra ela mesma criar uma senha nova. */
export async function enviarRedefinicaoSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}
