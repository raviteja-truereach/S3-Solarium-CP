import React, { useEffect, useRef } from 'react';
import { useNavigationState } from '@react-navigation/native';
import PerformanceObserver from '../services/PerformanceObserver';
import { Logger } from '../utils/Logger';

interface PerformanceNavigationWrapperProps {
  children: React.ReactNode;
}

export default function PerformanceNavigationWrapper({
  children,
}: PerformanceNavigationWrapperProps) {
  const navigationState = useNavigationState((state) => state);
  const previousRoute = useRef<string | null>(null);
  const navigationStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (!navigationState) return;

    try {
      const currentRoute = navigationState.routes[navigationState.index]?.name;

      if (
        currentRoute &&
        previousRoute.current &&
        currentRoute !== previousRoute.current
      ) {
        // Navigation completed - mark screen render complete
        setTimeout(() => {
          PerformanceObserver.markScreenRenderComplete(currentRoute);
          Logger.info(`Screen render completed for: ${currentRoute}`);
        }, 50);
      }

      if (currentRoute && currentRoute !== previousRoute.current) {
        if (previousRoute.current) {
          // Start measuring screen transition
          PerformanceObserver.measureScreenTransition(
            previousRoute.current,
            currentRoute
          );
          navigationStartTime.current = performance.now();
          Logger.info(
            `Navigation started: ${previousRoute.current} -> ${currentRoute}`
          );
        }
        previousRoute.current = currentRoute;
      }
    } catch (error) {
      Logger.error('Error in navigation performance tracking:', error);
    }
  }, [navigationState]);

  return <>{children}</>;
}
