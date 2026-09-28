import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { UserProfile } from './authTypes';

export async function listarUsuarios(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'usuarios'));
  return snap.docs.map((d) => d.data() as UserProfile);
}
