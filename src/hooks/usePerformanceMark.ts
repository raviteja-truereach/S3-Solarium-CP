import { useEffect, useRef, useCallback } from 'react';
import PerformanceObserver from '../services/PerformanceObserver';
import { error } from '../utils/Logger';

interface UsePerformanceMarkOptions {
  enabled?: boolean;
  autoStart?: boolean;
  metadata?: Record<string, any>;
}

export function usePerformanceMark(
  markName: string,
  options: UsePerformanceMarkOptions = {}
) {
  const { enabled = true, autoStart = false, metadata } = options;
  const startTimeRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  const startMark = useCallback(() => {
    if (!enabled || hasStartedRef.current) return;

    try {
      PerformanceObserver.mark(`${markName}-start`, metadata);
      startTimeRef.current = performance.now();
      hasStartedRef.current = true;
    } catch (err) {
      error(`Failed to start performance mark ${markName}:`, err);
    }
  }, [markName, enabled, metadata]);

  const endMark = useCallback(() => {
    if (!enabled || !hasStartedRef.current) return null;

    try {
      const endMarkName = `${markName}-end`;
      const result = PerformanceObserver.measure(
        markName,
        `${markName}-start`,
        endMarkName
      );
      hasStartedRef.current = false;
      startTimeRef.current = null;
      return result;
    } catch (err) {
      error(`Failed to end performance mark ${markName}:`, err);
      return null;
    }
  }, [markName, enabled]);

  const resetMark = useCallback(() => {
    hasStartedRef.current = false;
    startTimeRef.current = null;
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && enabled) {
      startMark();
    }

    return () => {
      if (hasStartedRef.current) {
        endMark();
      }
    };
  }, [autoStart, enabled, startMark, endMark]);

  return {
    startMark,
    endMark,
    resetMark,
    isActive: hasStartedRef.current,
    startTime: startTimeRef.current,
  };
}

export function useScreenRenderMark(
  screenName: string,
  componentCount?: number
) {
  const { startMark, endMark } = usePerformanceMark(
    `screen-render-${screenName}`,
    {
      autoStart: true,
      metadata: { screenName, componentCount },
    }
  );

  const markRenderComplete = useCallback(() => {
    endMark();
    PerformanceObserver.markScreenRenderComplete(screenName, componentCount);
  }, [endMark, screenName, componentCount]);

  return { markRenderComplete };
}

export function useNavigationMark() {
  const navigationInProgress = useRef(false);
  const currentRoute = useRef<string | null>(null);

  const startNavigation = useCallback(
    (fromScreen: string, toScreen: string) => {
      if (navigationInProgress.current) return;

      try {
        PerformanceObserver.measureScreenTransition(fromScreen, toScreen);
        navigationInProgress.current = true;
        currentRoute.current = toScreen;
      } catch (err) {
        error('Failed to start navigation mark:', err);
      }
    },
    []
  );

  const endNavigation = useCallback(() => {
    if (!navigationInProgress.current || !currentRoute.current) return;

    try {
      navigationInProgress.current = false;
      currentRoute.current = null;
    } catch (err) {
      error('Failed to end navigation mark:', err);
    }
  }, []);

  return {
    startNavigation,
    endNavigation,
    isNavigating: navigationInProgress.current,
    currentRoute: currentRoute.current,
  };
}

export function useMemoryTracking(interval: number = 10000) {
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  const startTracking = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      try {
        const memoryMetric = await PerformanceObserver.getMemoryUsage();
        // Memory metric is automatically sent to telemetry
      } catch (err) {
        error('Error in memory tracking:', err);
      }
    }, interval);
  }, [interval]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    startTracking,
    stopTracking,
    isTracking: intervalRef.current !== null,
  };
}
