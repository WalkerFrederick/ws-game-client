import { useCallback, useState } from 'react';

export const useOverlay = () => {
  const [isOverlayVisible, setOverlayVisible] = useState(false);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
  }, []);

  const hideOverlay = useCallback(() => {
    setOverlayVisible(false);
  }, []);

  return { isOverlayVisible, showOverlay, hideOverlay };
};
