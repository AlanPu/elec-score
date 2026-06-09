import { useState, useRef, useCallback, useEffect } from 'react';
import {
  PageTurnMode,
  SpeedPreset,
  SPEED_PRESET_INTERVALS,
} from '../types/score';

interface UseAutoPageTurnOptions {
  totalPages: number;
  onTurnPage: (page: number) => void;
}

export function useAutoPageTurn({ totalPages, onTurnPage }: UseAutoPageTurnOptions) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [pageTurnMode, setPageTurnMode] = useState<PageTurnMode>(PageTurnMode.Time);
  const [timeInterval, setTimeInterval] = useState(30);
  const [bpm, setBpm] = useState(120);
  const [measuresPerPage, setMeasuresPerPage] = useState(4);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>(SpeedPreset.Medium);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [currentMeasureInPage, setCurrentMeasureInPage] = useState(0);
  const [measuresPerPageMap, setMeasuresPerPageMap] = useState<Record<number, number>>({});

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnPageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPageRef = useRef(currentPage);
  const isRunningRef = useRef(isRunning);
  const remainingRef = useRef(remainingSeconds);
  const measuresPerPageRef = useRef(measuresPerPage);
  const measuresPerPageMapRef = useRef(measuresPerPageMap);
  const bpmRef = useRef(bpm);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const pageTurnModeRef = useRef(pageTurnMode);

  // 获取指定页的小节数（优先自定义，否则用默认值）
  const getMeasuresForPage = useCallback((pageIndex: number): number => {
    return measuresPerPageMap[pageIndex] ?? measuresPerPage;
  }, [measuresPerPageMap, measuresPerPage]);

  // 同步 ref
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  useEffect(() => {
    remainingRef.current = remainingSeconds;
  }, [remainingSeconds]);
  useEffect(() => {
    measuresPerPageRef.current = measuresPerPage;
  }, [measuresPerPage]);
  useEffect(() => {
    measuresPerPageMapRef.current = measuresPerPageMap;
  }, [measuresPerPageMap]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    beatsPerMeasureRef.current = beatsPerMeasure;
  }, [beatsPerMeasure]);
  useEffect(() => {
    pageTurnModeRef.current = pageTurnMode;
  }, [pageTurnMode]);

  // 计算指定页的翻页间隔
  const computeIntervalForPage = useCallback((pageIndex: number): number => {
    const pageMeasures = measuresPerPageMapRef.current[pageIndex] ?? measuresPerPageRef.current;
    switch (pageTurnModeRef.current) {
      case PageTurnMode.Time:
        return timeInterval;
      case PageTurnMode.Beat:
        return (60 / bpmRef.current) * pageMeasures * beatsPerMeasureRef.current;
      case PageTurnMode.Speed:
        return SPEED_PRESET_INTERVALS[speedPreset];
    }
  }, [timeInterval, speedPreset]);

  // 计算当前页翻页间隔
  const computedInterval = useCallback((): number => {
    return computeIntervalForPage(currentPageRef.current);
  }, [computeIntervalForPage]);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (turnPageTimeoutRef.current) {
      clearTimeout(turnPageTimeoutRef.current);
      turnPageTimeoutRef.current = null;
    }
  }, []);

  const scheduleNextTurn = useCallback(
    (interval: number) => {
      clearTimers();

      setRemainingSeconds(interval);
      remainingRef.current = interval;

      // 倒计时
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = Math.max(0, prev - 1);
          remainingRef.current = next;

          // 计算当前小节（使用当前页的小节数）
          const currentPageMeasures = measuresPerPageMapRef.current[currentPageRef.current] ?? measuresPerPageRef.current;
          const elapsed = interval - next;
          const pageProgress = elapsed / interval; // 0-1
          const measure = Math.min(
            Math.floor(pageProgress * currentPageMeasures),
            currentPageMeasures - 1
          );
          setCurrentMeasureInPage(measure);

          return next;
        });
      }, 1000);

      // 翻页
      turnPageTimeoutRef.current = setTimeout(() => {
        if (!isRunningRef.current) return;

        const nextPage = currentPageRef.current + 1;
        if (nextPage >= totalPages) {
          // 最后一页，停止
          clearTimers();
          setIsRunning(false);
          return;
        }

        setCurrentPage(nextPage);
        currentPageRef.current = nextPage;
        setCurrentMeasureInPage(0); // 翻页时重置小节
        onTurnPage(nextPage);

        // 用下一页的小节数计算新间隔
        const newInterval = computeIntervalForPage(nextPage);
        scheduleNextTurn(newInterval);
      }, interval * 1000);
    },
    [clearTimers, totalPages, onTurnPage, computeIntervalForPage]
  );

  const start = useCallback(() => {
    if (totalPages <= 1) return;
    setIsRunning(true);
    const interval = computedInterval();
    setRemainingSeconds(interval);
    scheduleNextTurn(interval);
  }, [totalPages, computedInterval, scheduleNextTurn]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimers();
  }, [clearTimers]);

  const resume = useCallback(() => {
    if (currentPageRef.current >= totalPages - 1) return;
    setIsRunning(true);
    // 从剩余时间继续
    const remaining = remainingRef.current;
    if (remaining <= 0) {
      const interval = computedInterval();
      scheduleNextTurn(interval);
    } else {
      clearTimers();
      const interval = computedInterval();
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = Math.max(0, prev - 1);
          remainingRef.current = next;

          // 计算当前小节（使用当前页的小节数）
          const currentPageMeasures = measuresPerPageMapRef.current[currentPageRef.current] ?? measuresPerPageRef.current;
          const elapsed = interval - next;
          const pageProgress = elapsed / interval; // 0-1
          const measure = Math.min(
            Math.floor(pageProgress * currentPageMeasures),
            currentPageMeasures - 1
          );
          setCurrentMeasureInPage(measure);

          return next;
        });
      }, 1000);
      turnPageTimeoutRef.current = setTimeout(() => {
        if (!isRunningRef.current) return;
        const nextPage = currentPageRef.current + 1;
        if (nextPage >= totalPages) {
          clearTimers();
          setIsRunning(false);
          return;
        }
        setCurrentPage(nextPage);
        currentPageRef.current = nextPage;
        setCurrentMeasureInPage(0); // 翻页时重置小节
        onTurnPage(nextPage);
        const newInterval = computeIntervalForPage(nextPage);
        scheduleNextTurn(newInterval);
      }, remaining * 1000);
    }
  }, [totalPages, computedInterval, scheduleNextTurn, clearTimers, onTurnPage, computeIntervalForPage]);

  const reset = useCallback(() => {
    clearTimers();
    setIsRunning(false);
    setCurrentPage(0);
    currentPageRef.current = 0;
    setCurrentMeasureInPage(0); // 重置小节
    setRemainingSeconds(computedInterval());
    onTurnPage(0);
  }, [clearTimers, computedInterval, onTurnPage]);

  const goToNextPage = useCallback(() => {
    if (currentPageRef.current < totalPages - 1) {
      const nextPage = currentPageRef.current + 1;
      setCurrentPage(nextPage);
      currentPageRef.current = nextPage;
      setCurrentMeasureInPage(0); // 翻页时重置小节
      onTurnPage(nextPage);
      // 如果正在运行，重新开始计时
      if (isRunningRef.current) {
        const newInterval = computeIntervalForPage(nextPage);
        scheduleNextTurn(newInterval);
      }
    }
  }, [totalPages, onTurnPage, scheduleNextTurn, computeIntervalForPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPageRef.current > 0) {
      const prevPage = currentPageRef.current - 1;
      setCurrentPage(prevPage);
      currentPageRef.current = prevPage;
      setCurrentMeasureInPage(0); // 翻页时重置小节
      onTurnPage(prevPage);
      if (isRunningRef.current) {
        const newInterval = computeIntervalForPage(prevPage);
        scheduleNextTurn(newInterval);
      }
    }
  }, [onTurnPage, scheduleNextTurn, computeIntervalForPage]);

  const setCurrentPageExternal = useCallback(
    (page: number) => {
      setCurrentPage(page);
      currentPageRef.current = page;
      setCurrentMeasureInPage(0); // 翻页时重置小节
      if (isRunningRef.current) {
        const newInterval = computeIntervalForPage(page);
        scheduleNextTurn(newInterval);
      }
    },
    [scheduleNextTurn, computeIntervalForPage]
  );

  // 设置指定页的自定义小节数
  const setMeasuresForPage = useCallback((page: number, value: number) => {
    setMeasuresPerPageMap((prev) => ({ ...prev, [page]: value }));
  }, []);

  // 移除指定页的自定义小节数（恢复默认）
  const removeMeasuresForPage = useCallback((page: number) => {
    setMeasuresPerPageMap((prev) => {
      const next = { ...prev };
      delete next[page];
      return next;
    });
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // 计算全局小节编号
  const measuresBeforeCurrentPage = Array.from({ length: currentPage }, (_, i) =>
    getMeasuresForPage(i)
  ).reduce((sum, m) => sum + m, 0);
  const currentMeasure = measuresBeforeCurrentPage + currentMeasureInPage;
  const totalMeasures = Array.from({ length: totalPages }, (_, i) =>
    getMeasuresForPage(i)
  ).reduce((sum, m) => sum + m, 0);

  return {
    currentPage,
    isRunning,
    pageTurnMode,
    timeInterval,
    bpm,
    measuresPerPage,
    beatsPerMeasure,
    speedPreset,
    remainingSeconds,
    currentMeasure,
    currentMeasureInPage,
    totalMeasures,
    measuresPerPageMap,
    getMeasuresForPage,
    setPageTurnMode,
    setTimeInterval,
    setBpm,
    setMeasuresPerPage,
    setBeatsPerMeasure,
    setSpeedPreset,
    setMeasuresForPage,
    removeMeasuresForPage,
    start,
    pause,
    resume,
    reset,
    goToNextPage,
    goToPreviousPage,
    setCurrentPage: setCurrentPageExternal,
    computedInterval: computedInterval(),
  };
}
