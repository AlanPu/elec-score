import { useState } from 'react';
import {
  PageTurnMode,
  SpeedPreset,
  SPEED_PRESET_LABELS,
  PAGE_TURN_MODE_LABELS,
} from '../types/score';

interface SettingsPanelProps {
  pageTurnMode: PageTurnMode;
  timeInterval: number;
  bpm: number;
  measuresPerPage: number;
  beatsPerMeasure: number;
  speedPreset: SpeedPreset;
  setPageTurnMode: (mode: PageTurnMode) => void;
  setTimeInterval: (val: number) => void;
  setBpm: (val: number) => void;
  setMeasuresPerPage: (val: number) => void;
  setBeatsPerMeasure: (val: number) => void;
  setSpeedPreset: (val: SpeedPreset) => void;
}

const panelStyles: Record<string, React.CSSProperties> = {
  trigger: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    transition: 'background-color 0.2s',
  },
  panel: {
    position: 'absolute',
    top: '64px',
    right: '16px',
    width: '280px',
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#fff',
    zIndex: 30,
    fontSize: '14px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginTop: '12px',
  },
  radioGroup: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
  radioItem: {
    flex: 1,
    padding: '6px 4px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.2s',
  },
  radioItemActive: {
    backgroundColor: 'var(--color-accent, #4a90d9)',
    borderColor: 'var(--color-accent, #4a90d9)',
    color: '#fff',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  label: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
  },
  input: {
    width: '72px',
    padding: '4px 8px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '13px',
    textAlign: 'right' as const,
    outline: 'none',
  },
  speedGroup: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
};

export default function SettingsPanel({
  pageTurnMode,
  timeInterval,
  bpm,
  measuresPerPage,
  beatsPerMeasure,
  speedPreset,
  setPageTurnMode,
  setTimeInterval,
  setBpm,
  setMeasuresPerPage,
  setBeatsPerMeasure,
  setSpeedPreset,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 齿轮触发按钮 */}
      <button
        style={panelStyles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="翻页设置"
      >
        ⚙
      </button>

      {/* 设置面板 */}
      {isOpen && (
        <div style={panelStyles.panel}>
          {/* 翻页模式 */}
          <div style={panelStyles.sectionTitle}>翻页模式</div>
          <div style={panelStyles.radioGroup}>
            {Object.values(PageTurnMode).map((mode) => (
              <button
                key={mode}
                style={{
                  ...panelStyles.radioItem,
                  ...(pageTurnMode === mode ? panelStyles.radioItemActive : {}),
                }}
                onClick={() => setPageTurnMode(mode)}
              >
                {PAGE_TURN_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* 按时间模式 */}
          {pageTurnMode === PageTurnMode.Time && (
            <div style={panelStyles.fieldRow}>
              <span style={panelStyles.label}>间隔秒数</span>
              <input
                type="number"
                min={1}
                max={600}
                value={timeInterval}
                onChange={(e) => setTimeInterval(Number(e.target.value))}
                style={panelStyles.input}
              />
            </div>
          )}

          {/* 按节拍模式 */}
          {pageTurnMode === PageTurnMode.Beat && (
            <>
              <div style={panelStyles.fieldRow}>
                <span style={panelStyles.label}>BPM</span>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  style={panelStyles.input}
                />
              </div>
              <div style={panelStyles.fieldRow}>
                <span style={panelStyles.label}>每页小节数</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={measuresPerPage}
                  onChange={(e) => setMeasuresPerPage(Number(e.target.value))}
                  style={panelStyles.input}
                />
              </div>
              <div style={panelStyles.fieldRow}>
                <span style={panelStyles.label}>每小节拍数</span>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={beatsPerMeasure}
                  onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
                  style={panelStyles.input}
                />
              </div>
            </>
          )}

          {/* 按速度模式 */}
          {pageTurnMode === PageTurnMode.Speed && (
            <div style={panelStyles.speedGroup}>
              {Object.values(SpeedPreset).map((preset) => (
                <button
                  key={preset}
                  style={{
                    ...panelStyles.radioItem,
                    ...(speedPreset === preset ? panelStyles.radioItemActive : {}),
                  }}
                  onClick={() => setSpeedPreset(preset)}
                >
                  {SPEED_PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
