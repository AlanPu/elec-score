import { useEffect, useRef } from 'react';

interface MeasureHighlightProps {
  currentMeasureInPage: number;
  measuresPerPage: number;
  pageWidth: number;
  pageHeight: number;
  isRunning: boolean;
  offset?: { x: number; y: number };
}

export default function MeasureHighlight({
  currentMeasureInPage,
  measuresPerPage,
  pageWidth,
  pageHeight,
  isRunning,
  offset = { x: 0, y: 0 },
}: MeasureHighlightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRunning || measuresPerPage <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // 设置 Canvas 尺寸
    canvas.width = Math.floor(pageWidth * dpr);
    canvas.height = Math.floor(pageHeight * dpr);
    canvas.style.width = `${Math.floor(pageWidth)}px`;
    canvas.style.height = `${Math.floor(pageHeight)}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 清空画布
    ctx.clearRect(0, 0, pageWidth, pageHeight);

    // 计算小节位置（假设横向均匀分布）
    const measureWidth = pageWidth / measuresPerPage;
    const measureX = currentMeasureInPage * measureWidth;

    // 绘制高亮标记（顶部进度条）
    const highlightHeight = 8;
    const highlightY = 20; // 距离顶部20px

    // 绘制半透明背景
    ctx.fillStyle = 'rgba(74, 144, 217, 0.3)';
    ctx.fillRect(measureX, highlightY, measureWidth, highlightHeight);

    // 绘制边框
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(measureX, highlightY, measureWidth, highlightHeight);

    // 绘制小节编号标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelX = measureX + measureWidth / 2;
    const labelY = highlightY + highlightHeight / 2;
    ctx.fillText(`${currentMeasureInPage + 1}`, labelX, labelY);

  }, [currentMeasureInPage, measuresPerPage, pageWidth, pageHeight, isRunning]);

  if (!isRunning) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
