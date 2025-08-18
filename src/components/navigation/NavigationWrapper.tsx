import React, { useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useNavigationMark } from '../../hooks/usePerformanceMark';
import PerformanceObserver from '../../services/PerformanceObserver';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export default function NavigationWrapper({
  children,
}: NavigationWrapperProps) {
  const { startNavigation, endNavigation } = useNavigationMark();
  const navigationState = useNavigationState((state) => state);
  const previousRoute = React.useRef<string | null>(null);

  useEffect(() => {
    if (!navigationState) return;

    const currentRoute = navigationState.routes[navigationState.index]?.name;

    if (
      currentRoute &&
      previousRoute.current &&
      currentRoute !== previousRoute.current
    ) {
      // Navigation completed
      endNavigation();

      // Start new navigation measurement
      setTimeout(() => {
        PerformanceObserver.markScreenRenderComplete(currentRoute);
      }, 50);
    }

    if (currentRoute && currentRoute !== previousRoute.current) {
      if (previousRoute.current) {
        startNavigation(previousRoute.current, currentRoute);
      }
      previousRoute.current = currentRoute;
    }
  }, [navigationState, startNavigation, endNavigation]);

  return <>{children}</>;
}
