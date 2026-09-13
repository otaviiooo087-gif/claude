import { Task } from './types';

// Nome novo de propósito: a versão anterior do app já criava um banco
// "painel-operacional" na v1 sem a tabela appState. Reabrir com o mesmo
// nome faz o navegador pular onupgradeneeded (mesma versão) e a tabela
// nova nunca é criada, travando o app para sempre em "Carregando...".
// Um nome de banco isolado evita qualquer colisão de schema.
const DB_NAME = 'painel-operacional-v2';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const STATE_STORE = 'appState';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Nunca deixar a abertura do banco travar o app para sempre: se outra
    // aba antiga segurar o banco aberto (evento "blocked") ou qualquer coisa
    // impedir a conclusão, desiste depois de alguns segundos em vez de
    // ficar pendurado silenciosamente.
    const timeout = setTimeout(() => reject(new Error('Tempo esgotado ao abrir o banco de dados local.')), 8000);
    const settle = (fn: () => void) => {
      clearTimeout(timeout);
      fn();
    };

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        store.createIndex('data', 'data');
        store.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => settle(() => resolve(request.result));
    request.onerror = () => settle(() => reject(request.error));
    request.onblocked = () => settle(() => reject(new Error('Banco de dados local bloqueado por outra aba.')));
  });
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readonly');
    const request = tx.objectStore(TASKS_STORE).getAll();
    request.onsuccess = () => resolve(request.result as Task[]);
    request.onerror = () => reject(request.error);
  });
}

export async function putTask(task: Task): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    tx.objectStore(TASKS_STORE).put(task);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putManyTasks(tasks: Task[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    const store = tx.objectStore(TASKS_STORE);
    tasks.forEach((t) => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    tx.objectStore(TASKS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getState<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const request = tx.objectStore(STATE_STORE).get(key);
    request.onsuccess = () => resolve(request.result?.value as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function setState(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    tx.objectStore(STATE_STORE).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
