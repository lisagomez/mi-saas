'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // CRITICO: usar window.location.origin (iOS rechaza redirects 307)
    const swUrl = `${window.location.origin}/sw.js`;

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        // Verificar updates cada 60 minutos
        setInterval(() => registration.update(), 60 * 60 * 1000);

        // Forzar activacion de nueva version
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              setTimeout(() => window.location.reload(), 1000);
            }
          });
        });
      })
      .catch((err) => console.error('[PWA] Registration failed:', err));
  }, []);

  return null;
}
