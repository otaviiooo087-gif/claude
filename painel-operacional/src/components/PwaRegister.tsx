'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // silencioso: app continua funcionando sem cache offline
      });
    }
  }, []);

  return null;
}
