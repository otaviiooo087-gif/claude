'use client';

import { useEffect, useRef } from 'react';
import { Task } from './types';
import { registrarProdutividade } from './produtividade';

/** Sincroniza pro Firestore cada tarefa concluída, pro admin ver o relatório de produtividade do dia. */
export function useSyncProdutividade(uid: string | null, nome: string, ativo: boolean, tasks: Task[]) {
  const sincronizadasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ativo || !uid) return;
    tasks.forEach((task) => {
      if (task.status !== 'CONCLUIDA' || !task.completedAt) return;
      if (sincronizadasRef.current.has(task.id)) return;
      sincronizadasRef.current.add(task.id);
      registrarProdutividade(uid, nome, task).catch(() => {
        sincronizadasRef.current.delete(task.id);
      });
    });
  }, [ativo, uid, nome, tasks]);
}
