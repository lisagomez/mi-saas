'use client';

import { useState, useEffect } from 'react';
import { usePushSubscription } from '../hooks/usePushSubscription';

interface PushNotificationPromptProps {
  userId?: string;
  autoShowDelay?: number;
}

export function PushNotificationPrompt({
  userId,
  autoShowDelay = 3000,
}: PushNotificationPromptProps) {
  const { isSupported, permission, isSubscribed, subscribe } =
    usePushSubscription(userId);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupported || isSubscribed || permission === 'denied') return;

    const dismissed = localStorage.getItem('push-prompt-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), autoShowDelay);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, autoShowDelay]);

  if (!show) return null;

  const handleEnable = async () => {
    localStorage.setItem('push-prompt-dismissed', 'true');
    await subscribe();
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push-prompt-dismissed', 'true');
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-card border
                    border-border rounded-lg p-4 shadow-lg space-y-3">
      <p className="text-sm font-medium">Activar notificaciones?</p>
      <p className="text-xs text-muted-foreground">
        Recibe avisos importantes incluso cuando no tengas la app abierta.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground
                     rounded-md hover:opacity-90"
        >
          Activar
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
