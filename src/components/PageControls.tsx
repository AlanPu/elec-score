import { useEffect, useRef, useState } from 'react';

interface PageControlsProps {
  isRunning: boolean;
  currentPage: number;
  totalPages: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStartWakeLock?: () => void;
}

const AUTO_HIDE_DELAY = 3000;

export default function PageControls({
  isRunning,
  currentPage,
  totalPages,
  onStart,
  onPause,
  onResume,
  onReset,
  onPrev,
  onNext,
  onStartWakeLock,
}: PageControlsProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetTimer = () => {
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
  };

  useEffect(() => {
    resetTimer();
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  const handlePlayPause = () => {
    resetTimer();
    if (isRunning) {
      onPause();
    } else if (currentPage > 0) {
      onResume();
      onStartWakeLock?.();
    } else {
      onStart();
      onStartWakeLock?.();
    }
  };

  const playLabel = isRunning ? '⏸' : currentPage > 0 ? '▶' : '▶';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '24px',
        backgroundColor: visible ? 'rgba(30, 30, 30, 0.75)' : 'rgba(30, 30, 30, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 20,
        opacity: visible ? 1 : 0.2,
        transition: 'opacity 0.5s ease, background-color 0.5s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={() => { setVisible(true); clearTimeout(timerRef.current); }}
      onMouseLeave={() => resetTimer()}
    >
      {/* 上一页 */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'background-color 0.2s, transform 0.1s',
          lineHeight: 1,
          opacity: currentPage <= 0 ? 0.3 : 1,
          pointerEvents: currentPage <= 0 ? 'none' : 'auto',
        }}
        onClick={() => { resetTimer(); onPrev(); }}
        disabled={currentPage <= 0}
        title="上一页"
      >
        ◀
      </button>

      {/* 重置 */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'background-color 0.2s, transform 0.1s',
          lineHeight: 1,
        }}
        onClick={() => { resetTimer(); onReset(); }}
        title="重置"
      >
        ↺
      </button>

      <div style={{
        width: '1px',
        height: '24px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        margin: '0 4px',
      }} />

      {/* 播放/暂停 */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent, #4a90d9)',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer',
          transition: 'background-color 0.2s, transform 0.1s',
          lineHeight: 1,
        }}
        onClick={handlePlayPause}
        title={isRunning ? '暂停' : currentPage > 0 ? '继续' : '开始'}
      >
        {playLabel}
      </button>

      <div style={{
        width: '1px',
        height: '24px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        margin: '0 4px',
      }} />

      {/* 下一页 */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          transition: 'background-color 0.2s, transform 0.1s',
          lineHeight: 1,
          opacity: currentPage >= totalPages - 1 ? 0.3 : 1,
          pointerEvents: currentPage >= totalPages - 1 ? 'none' : 'auto',
        }}
        onClick={() => { resetTimer(); onNext(); }}
        disabled={currentPage >= totalPages - 1}
        title="下一页"
      >
        ▶
      </button>
    </div>
  );
}
