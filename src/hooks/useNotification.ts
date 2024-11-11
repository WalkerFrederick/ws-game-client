import { useCallback, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  message: string;
  type: NotificationType;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationOptions | null>(
    null
  );

  const showNotification = useCallback(
    (message: string, type: NotificationType) => {
      setNotification({ message, type });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
  };
};
