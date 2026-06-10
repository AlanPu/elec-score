import { useCallback, useEffect, useRef, useState } from 'react';
import NoSleep from 'nosleep.js';

export function useScreenWakeLock() {
  const noSleepRef = useRef<NoSleep | null>(null);
  const shouldBeActiveRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    noSleepRef.current = new NoSleep();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldBeActiveRef.current) {
        noSleepRef.current?.enable();
        setIsActive(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      noSleepRef.current?.disable();
    };
  }, []);

  const request = useCallback(async () => {
    if (isActive) return;

    shouldBeActiveRef.current = true;
    noSleepRef.current?.enable();
    setIsActive(true);
  }, [isActive]);

  const release = useCallback(() => {
    shouldBeActiveRef.current = false;
    noSleepRef.current?.disable();
    setIsActive(false);
  }, []);

  return {
    request,
    release,
    isActive,
  };
}