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

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnPageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPageRef = useRef(currentPage);
  const isRunningRef = useRef(isRunning);
  const remainingRef = useRef(remainingSeconds);

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

  // 计算翻页间隔
  const computedInterval = useCallback((): number => {
    switch (pageTurnMode) {
      case PageTurnMode.Time:
        return timeInterval;
      case PageTurnMode.Beat:
        return (60 / bpm) * measuresPerPage * beatsPerMeasure;
      case PageTurnMode.Speed:
        return SPEED_PRESET_INTERVALS[speedPreset];
    }
  }, [pageTurnMode, timeInterval, bpm, measuresPerPage, beatsPerMeasure, speedPreset]);

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

          // 计算当前小节
          const elapsed = interval - next;
          const pageProgress = elapsed / interval; // 0-1
          const measure = Math.min(
            Math.floor(pageProgress * measuresPerPage),
            measuresPerPage - 1
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

        // 安排下一次翻页
        scheduleNextTurn(interval);
      }, interval * 1000);
    },
    [clearTimers, totalPages, onTurnPage]
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
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = Math.max(0, prev - 1);
          remainingRef.current = next;

          // 计算当前小节
          const interval = computedInterval();
          const elapsed = interval - next;
          const pageProgress = elapsed / interval; // 0-1
          const measure = Math.min(
            Math.floor(pageProgress * measuresPerPage),
            measuresPerPage - 1
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
        scheduleNextTurn(computedInterval());
      }, remaining * 1000);
    }
  }, [totalPages, computedInterval, scheduleNextTurn, clearTimers, onTurnPage, measuresPerPage]);

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
        scheduleNextTurn(computedInterval());
      }
    }
  }, [totalPages, onTurnPage, scheduleNextTurn, computedInterval]);

  const goToPreviousPage = useCallback(() => {
    if (currentPageRef.current > 0) {
      const prevPage = currentPageRef.current - 1;
      setCurrentPage(prevPage);
      currentPageRef.current = prevPage;
      setCurrentMeasureInPage(0); // 翻页时重置小节
      onTurnPage(prevPage);
      if (isRunningRef.current) {
        scheduleNextTurn(computedInterval());
      }
    }
  }, [onTurnPage, scheduleNextTurn, computedInterval]);

  const setCurrentPageExternal = useCallback(
    (page: number) => {
      setCurrentPage(page);
      currentPageRef.current = page;
      setCurrentMeasureInPage(0); // 翻页时重置小节
      if (isRunningRef.current) {
        scheduleNextTurn(computedInterval());
      }
    },
    [scheduleNextTurn, computedInterval]
  );

  // 清理
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // 计算全局小节编号
  const currentMeasure = currentPage * measuresPerPage + currentMeasureInPage;
  const totalMeasures = totalPages * measuresPerPage;

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
    setPageTurnMode,
    setTimeInterval,
    setBpm,
    setMeasuresPerPage,
    setBeatsPerMeasure,
    setSpeedPreset,
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
