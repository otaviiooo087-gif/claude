import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    try {
      // Guarda leituras/escritas em IndexedDB local: se o operador ficar sem
      // sinal em campo, a localização continua sendo salva no aparelho e
      // sincroniza sozinha com o Firestore assim que a internet voltar.
      dbInstance = initializeFirestore(getFirebaseApp(), {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
        // Muita tarefa/contrato/produto no app tem campo opcional (telefone,
        // endereço, valor...) que vira `undefined` em vez de ausente quando
        // não preenchido. Sem isso, o Firestore rejeita a escrita inteira com
        // "Unsupported field value: undefined" em vez de só ignorar o campo.
        ignoreUndefinedProperties: true,
      });
    } catch {
      // Ambientes sem suporte a IndexedDB (ex: aba privada) caem para o
      // comportamento padrão, só sem cache offline.
      dbInstance = initializeFirestore(getFirebaseApp(), { ignoreUndefinedProperties: true });
    }
  }
  return dbInstance;
}
