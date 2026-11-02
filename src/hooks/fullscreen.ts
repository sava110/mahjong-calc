import { useCallback, useEffect, useState } from 'react';

// Shows something over the whole page, for a phone left on the table.
// Where the browser allows, it also hides the browser's own bars (the
// Fullscreen API; not on iPhone) and keeps the screen on (Wake Lock).
// Either may be refused, so the page-filling layout never depends on them.
export const useFullscreenMode = () => {
  const [active, setActive] = useState(false);

  const enter = useCallback(() => {
    setActive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    setActive(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;

    // Leaving the browser's fullscreen (back gesture, Esc) leaves ours too
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setActive(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
    };

    let lock: WakeLockSentinel | null = null;
    let released = false;
    const requestLock = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        ?.request('screen')
        .then(l => {
          if (released) l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    };
    // The lock is dropped whenever the page is hidden
    const onVisibilityChange = () => requestLock();

    requestLock();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      released = true;
      lock?.release().catch(() => {});
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, exit]);

  return { active, enter, exit };
};
