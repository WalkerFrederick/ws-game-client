import React, { useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const mapTypeToBG = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={`${mapTypeToBG[type]} absolute z-50 w-full flex justify-between max-w-[600px] p-6 shadow rounded fade-up-in`}
    >
      <span>{message}</span>
      <button onClick={onClose}>✕</button>
      <style jsx>{`
        .fade-up-in {
          animation: fadeIn 0.3s forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Notification;
