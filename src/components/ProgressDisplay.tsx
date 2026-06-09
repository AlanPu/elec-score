interface ProgressDisplayProps {
  currentPage: number;
  totalPages: number;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  text: {
    fontSize: '12px',
    color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
    marginBottom: '4px',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  barTrack: {
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  barFill: {
    height: '100%',
    backgroundColor: 'var(--color-accent, #4a90d9)',
    transition: 'width 0.3s ease',
    borderRadius: '0 2px 2px 0',
  },
};

export default function ProgressDisplay({ currentPage, totalPages }: ProgressDisplayProps) {
  const progress = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <div style={styles.container}>
      <span style={styles.text}>
        {currentPage + 1} / {totalPages}
      </span>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${progress}%` }} />
      </div>
    </div>
  );
}
