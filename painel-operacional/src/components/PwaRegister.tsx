'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        registration = reg;
        // O navegador só confere atualização do service worker de tempos em
        // tempos sozinho (pode levar até 24h). Forçamos a checagem sempre que
        // o app instalado é aberto ou volta ao primeiro plano.
        reg.update();
      })
      .catch(() => {
        // silencioso: app continua funcionando sem cache offline
      });

    function onVisible() {
      if (document.visibilityState === 'visible') registration?.update();
    }
    document.addEventListener('visibilitychange', onVisible);

    // Quando uma versão nova assume o controle da página, recarrega
    // automaticamente para já mostrar a atualização, sem o usuário precisar
    // fechar e abrir o app manualmente.
    let recarregando = false;
    function onControllerChange() {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
