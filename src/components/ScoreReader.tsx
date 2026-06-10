import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { ScoreMeta } from '../types/score';
import { loadPdfFromBase64 } from '../utils/pdfImporter';
import { loadPdfData } from '../utils/storage';
import { useAutoPageTurn } from '../hooks/useAutoPageTurn';
import { useScreenWakeLock } from '../hooks/useScreenWakeLock';
import PageControls from './PageControls';
import ProgressDisplay from './ProgressDisplay';
import SettingsPanel from './SettingsPanel';
import MeasureHighlight from './MeasureHighlight';

interface ScoreReaderProps {
  score: ScoreMeta;
  onBack: () => void;
}

export default function ScoreReader({ score, onBack }: ScoreReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const { request: requestWakeLock, release: releaseWakeLock } = useScreenWakeLock();

  // 拖动/平移状态
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef({ x: 0, y: 0 });

  // 渲染指定页的 PDF 到 Canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(pageNum + 1);
    const dpr = window.devicePixelRatio || 1;
    const baseViewport = page.getViewport({ scale: 1 });

    const container = containerRef.current;
    let fitScale = 1;
    if (container) {
      const scaleX = container.clientWidth / baseViewport.width;
      const scaleY = container.clientHeight / baseViewport.height;
      fitScale = Math.min(scaleX, scaleY);
    }

    const finalScale = fitScale * scaleRef.current;
    const viewport = page.getViewport({ scale: finalScale });

    const canvas = canvasRef.current;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    // 更新 Canvas 尺寸状态
    setCanvasSize({
      width: Math.floor(viewport.width),
      height: Math.floor(viewport.height),
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  }, [pdfDoc]);

  // 自动翻页 Hook
  const autoPageTurn = useAutoPageTurn({
    scoreId: score.id,
    totalPages: score.pageCount,
    onTurnPage: (page) => {
      renderPage(page);
    },
  });

  // 加载 PDF（从 IndexedDB 读取）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadPdfData(score.id)
      .then((pdfBase64) => {
        if (!pdfBase64) throw new Error('PDF 数据未找到');
        return loadPdfFromBase64(pdfBase64);
      })
      .then((doc) => {
        if (!cancelled) {
          setPdfDoc(doc);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [score.id]);

  // 初次渲染 & 缩放变化时重新渲染
  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(autoPageTurn.currentPage);
  }, [pdfDoc, autoPageTurn.currentPage, renderPage, scale]);

  // 窗口 resize 时重新渲染
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        renderPage(autoPageTurn.currentPage);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, autoPageTurn.currentPage, renderPage]);

  // 播放状态停止时释放屏幕唤醒锁
  useEffect(() => {
    if (!autoPageTurn.isRunning) {
      releaseWakeLock();
    }
  }, [autoPageTurn.isRunning, releaseWakeLock]);

  // 键盘翻页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        autoPageTurn.goToPreviousPage();
      } else if (e.key === 'ArrowRight') {
        autoPageTurn.goToNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoPageTurn.goToPreviousPage, autoPageTurn.goToNextPage]);


  // 缩放：Ctrl + 滚轮
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((prev) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const next = Math.min(3, Math.max(0.5, prev + delta));
        scaleRef.current = next;
        // 缩放时重置偏移
        offsetRef.current = { x: 0, y: 0 };
        setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // 双指缩放
  useEffect(() => {
    let initialDistance = 0;
    let initialScale = 1;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialScale = scaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const ratio = currentDistance / initialDistance;
        const next = Math.min(3, Math.max(0.5, initialScale * ratio));
        scaleRef.current = next;
        offsetRef.current = { x: 0, y: 0 };
        setOffset({ x: 0, y: 0 });
        setScale(next);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 鼠标拖动（缩放 > 1 时）
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (scaleRef.current <= 1) return;
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragOffsetStartRef.current = { ...offsetRef.current };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newOffset = {
        x: dragOffsetStartRef.current.x + dx,
        y: dragOffsetStartRef.current.y + dy,
      };
      offsetRef.current = newOffset;
      setOffset(newOffset);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 触摸拖动（单指，缩放 > 1 时）
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || scaleRef.current <= 1) return;
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragOffsetStartRef.current = { ...offsetRef.current };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const newOffset = {
        x: dragOffsetStartRef.current.x + dx,
        y: dragOffsetStartRef.current.y + dy,
      };
      offsetRef.current = newOffset;
      setOffset(newOffset);
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: '18px' }}>加载中…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* PDF 画布 - 支持拖动偏移 */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          cursor: scale > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
          transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease',
        }}
      />

      {/* 小节高亮显示 */}
      <MeasureHighlight
        currentMeasureInPage={autoPageTurn.currentMeasureInPage}
        measuresPerPage={autoPageTurn.getMeasuresForPage(autoPageTurn.currentPage)}
        pageWidth={canvasSize.width}
        pageHeight={canvasSize.height}
        isRunning={autoPageTurn.isRunning}
        offset={offset}
      />

      {/* 返回按钮 */}
      <button
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: 'rgba(30, 30, 30, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
          fontSize: '14px',
          cursor: 'pointer',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onClick={onBack}
      >
        ← 返回乐谱库
      </button>

      {/* 设置面板 */}
      <SettingsPanel
        pageTurnMode={autoPageTurn.pageTurnMode}
        timeInterval={autoPageTurn.timeInterval}
        bpm={autoPageTurn.bpm}
        measuresPerPage={autoPageTurn.measuresPerPage}
        beatsPerMeasure={autoPageTurn.beatsPerMeasure}
        speedPreset={autoPageTurn.speedPreset}
        measuresPerPageMap={autoPageTurn.measuresPerPageMap}
        totalPages={score.pageCount}
        getMeasuresForPage={autoPageTurn.getMeasuresForPage}
        setPageTurnMode={autoPageTurn.setPageTurnMode}
        setTimeInterval={autoPageTurn.setTimeInterval}
        setBpm={autoPageTurn.setBpm}
        setMeasuresPerPage={autoPageTurn.setMeasuresPerPage}
        setBeatsPerMeasure={autoPageTurn.setBeatsPerMeasure}
        setSpeedPreset={autoPageTurn.setSpeedPreset}
        setMeasuresForPage={autoPageTurn.setMeasuresForPage}
        removeMeasuresForPage={autoPageTurn.removeMeasuresForPage}
      />

      {/* 翻页控制 */}
      <PageControls
        isRunning={autoPageTurn.isRunning}
        currentPage={autoPageTurn.currentPage}
        totalPages={score.pageCount}
        onStart={autoPageTurn.start}
        onPause={autoPageTurn.pause}
        onResume={autoPageTurn.resume}
        onReset={autoPageTurn.reset}
        onPrev={autoPageTurn.goToPreviousPage}
        onNext={autoPageTurn.goToNextPage}
        onStartWakeLock={requestWakeLock}
      />

      {/* 进度显示 */}
      <ProgressDisplay
        currentPage={autoPageTurn.currentPage}
        totalPages={score.pageCount}
        currentMeasure={autoPageTurn.currentMeasure}
        totalMeasures={autoPageTurn.totalMeasures}
      />
    </div>
  );
}
