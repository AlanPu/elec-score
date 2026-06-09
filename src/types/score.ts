// 乐谱元数据（存 localStorage）
export interface ScoreMeta {
  id: string;
  name: string;
  thumbnail: string; // base64 编码的缩略图
  pageCount: number;
  addedDate: number; // 时间戳
  fileSize: number; // 文件大小（字节）
}

// 完整乐谱（含 PDF 数据，仅内存中使用）
export interface Score extends ScoreMeta {
  pdfData: string; // base64 编码的 PDF 数据（仅导入时临时使用）
}

export const PageTurnMode = {
  Time: 'time',
  Beat: 'beat',
  Speed: 'speed',
} as const;

export type PageTurnMode = (typeof PageTurnMode)[keyof typeof PageTurnMode];

export const SpeedPreset = {
  Slow: 'slow',
  Medium: 'medium',
  Fast: 'fast',
} as const;

export type SpeedPreset = (typeof SpeedPreset)[keyof typeof SpeedPreset];

export const SPEED_PRESET_INTERVALS: Record<SpeedPreset, number> = {
  [SpeedPreset.Slow]: 30,
  [SpeedPreset.Medium]: 20,
  [SpeedPreset.Fast]: 12,
};

export const SPEED_PRESET_LABELS: Record<SpeedPreset, string> = {
  [SpeedPreset.Slow]: '慢速',
  [SpeedPreset.Medium]: '中速',
  [SpeedPreset.Fast]: '快速',
};

export const PAGE_TURN_MODE_LABELS: Record<PageTurnMode, string> = {
  [PageTurnMode.Time]: '按时间',
  [PageTurnMode.Beat]: '按节拍',
  [PageTurnMode.Speed]: '按速度',
};
