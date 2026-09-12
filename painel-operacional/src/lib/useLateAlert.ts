'use client';

import { useEffect, useRef, useState } from 'react';
import { Task } from './types';
import { isAtrasada } from './format';

/**
 * Observa as tarefas do dia e, assim que alguma cruza o horário e vira
 * "atrasada" pela primeira vez, vibra o celular (quando suportado) e
 * devolve a lista de tarefas atrasadas ainda não concluídas para a UI
 * sugerir avisar o cliente. Não vibra de novo pra uma tarefa que já
 * tinha sido detectada como atrasada nesta sessão.
 */
export function useLateAlert(tasks: Task[]): Task[] {
  const [lateTasks, setLateTasks] = useState<Task[]>([]);
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function check() {
      const atrasadas = tasks.filter((t) => t.status !== 'CONCLUIDA' && isAtrasada(t));

      const novasAtrasadas = atrasadas.filter((t) => !alertedRef.current.has(t.id));
      if (novasAtrasadas.length > 0) {
        novasAtrasadas.forEach((t) => alertedRef.current.add(t.id));
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([300, 150, 300, 150, 300]);
        }
      }

      // Se a tarefa foi concluída ou reaberta antes do horário, libera o id
      // para poder alertar de novo se ela ficar atrasada outra vez.
      const idsAtuais = new Set(atrasadas.map((t) => t.id));
      alertedRef.current.forEach((id) => {
        if (!idsAtuais.has(id)) alertedRef.current.delete(id);
      });

      setLateTasks(atrasadas);
    }

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  return lateTasks;
}
