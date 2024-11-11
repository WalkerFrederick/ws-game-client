import React, { useEffect } from 'react';

interface OverlayProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  disableClose?: boolean; // New prop to disable closing
}

const Overlay: React.FC<OverlayProps> = ({
  isVisible,
  onClose,
  children,
  disableClose,
}) => {
  // Close the overlay on pressing 'Escape' key if disableClose is false
  useEffect(() => {
    if (disableClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, disableClose]);

  if (!isVisible) return null;

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disableClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm'
      onClick={handleBackgroundClick}
    >
      {children}
    </div>
  );
};

export default Overlay;
