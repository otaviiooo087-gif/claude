'use client';

import { useEffect, useRef } from 'react';
import { ouvirTarefasAtribuidas } from './tarefasAtribuidas';
import { CAMPOS_CONTROLADOS_PELO_ADMIN, Task } from './types';

/**
 * Fica ouvindo, em tempo real, as tarefas que o admin atribuiu pra esse
 * operador no Firestore. Tarefa nova (id que ainda não existe localmente)
 * entra inteira. Tarefa que já existe localmente só recebe os campos que o
 * admin controla (data, horário, endereço, ajudante, cancelamento etc) —
 * nunca sobrescreve o que o operador já registrou em campo (checklist,
 * status, observação, confirmação de pagamento).
 */
export function useSincronizarAtribuidas(
  uid: string | null,
  ativo: boolean,
  carregando: boolean,
  tasksLocais: Task[],
  importTasks: (novas: Task[]) => Promise<void>
) {
  const tasksLocaisRef = useRef(tasksLocais);
  tasksLocaisRef.current = tasksLocais;

  useEffect(() => {
    if (!ativo || carregando || !uid) return;

    return ouvirTarefasAtribuidas(uid, (remotas) => {
      if (remotas.length === 0) return;
      const locaisPorId = new Map(tasksLocaisRef.current.map((t) => [t.id, t]));

      const paraSalvar: Task[] = [];
      for (const remota of remotas) {
        const local = locaisPorId.get(remota.id);
        if (!local) {
          paraSalvar.push(remota);
          continue;
        }

        const mudou = CAMPOS_CONTROLADOS_PELO_ADMIN.some(
          (campo) => JSON.stringify(local[campo]) !== JSON.stringify(remota[campo])
        );
        if (!mudou) continue;

        const patch: Partial<Task> = {};
        for (const campo of CAMPOS_CONTROLADOS_PELO_ADMIN) {
          (patch as Record<string, unknown>)[campo] = remota[campo];
        }
        paraSalvar.push({ ...local, ...patch });
      }

      if (paraSalvar.length > 0) importTasks(paraSalvar).catch(() => {});
    });
  }, [ativo, carregando, uid, importTasks]);
}
