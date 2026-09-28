'use client';

import { useEffect, useRef } from 'react';
import { buscarTarefasAtribuidas } from './tarefasAtribuidas';
import { Task } from './types';

/**
 * Ao logar, puxa uma vez as tarefas que o admin atribuiu pra esse operador
 * no Firestore e junta com a agenda local (sem sobrescrever nada que já
 * exista com o mesmo id — mesma lógica não-destrutiva do seed local).
 * Roda só uma vez por sessão de login (guardado pelo ref), não fica
 * escutando o tempo todo.
 */
export function useSincronizarAtribuidas(
  uid: string | null,
  ativo: boolean,
  carregando: boolean,
  tasksLocais: Task[],
  importTasks: (novas: Task[]) => Promise<void>
) {
  const sincronizadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ativo || carregando || !uid) return;
    if (sincronizadoRef.current === uid) return;
    sincronizadoRef.current = uid;

    (async () => {
      try {
        const atribuidas = await buscarTarefasAtribuidas(uid);
        if (atribuidas.length === 0) return;
        const idsExistentes = new Set(tasksLocais.map((t) => t.id));
        const novas = atribuidas.filter((t) => !idsExistentes.has(t.id));
        if (novas.length > 0) await importTasks(novas);
      } catch {
        // Sem internet ou erro de permissão: tenta de novo no próximo carregamento do app.
        sincronizadoRef.current = null;
      }
    })();
  }, [ativo, carregando, uid, tasksLocais, importTasks]);
}
