import { useState, useCallback } from 'react';
import { sanitizeUserErrorMessage } from '../services/apiError';

export function useToast(duration = 2500) {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((message) => {
    if (!message) return;
    const cleanMessage = sanitizeUserErrorMessage(message);
    setToastMessage(cleanMessage);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return {
    toastMessage,
    showToast,
  };
}
