'use client';

import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Task } from './types';

/**
 * Mantém `localizacoes/{uid}` com um resumo da tarefa atual do operador,
 * para o admin calcular atraso sem precisar migrar a agenda inteira (que
 * continua local, por dispositivo) para o Firestore.
 */
export function useSyncTarefaAtual(uid: string | null, ativo: boolean, tarefa: Task | undefined) {
  const ultimoIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ativo || !uid) return;
    if (ultimoIdRef.current === tarefa?.id) return;
    ultimoIdRef.current = tarefa?.id;

    setDoc(
      doc(getFirebaseDb(), 'localizacoes', uid),
      {
        tarefaAtual: tarefa ? `${tarefa.cliente}` : null,
        tarefaHorario: tarefa?.horario ?? null,
        tarefaHorarioComparacao: tarefa?.horarioComparacao ?? null,
        tarefaEndereco: tarefa?.endereco ?? null,
        tarefaCidade: tarefa?.cidade ?? null,
      },
      { merge: true }
    ).catch(() => {});
  }, [ativo, uid, tarefa]);
}
