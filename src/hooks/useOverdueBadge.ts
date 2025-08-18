import { useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { selectOverdueCount } from '../store/selectors/leadSelectors';

/**
 * Hook to manage overdue badge on Home tab
 *
 * Features:
 * - Subscribes to selectOverdueCount
 * - Updates tab bar badge with throttling
 * - Auto-hides badge when count is 0
 * - Debounced updates to prevent render storms
 */
export const useOverdueBadge = () => {
  const navigation = useNavigation();
  const overdueCount = useAppSelector(selectOverdueCount);

  // Refs for throttling and debouncing
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousCountRef = useRef<number>(-1);

  // Throttled badge update function
  const updateBadge = useCallback(
    (count: number) => {
      // Cancel any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      const minDelay = 300; // 300ms debounce

      const performUpdate = () => {
        try {
          // Determine badge value
          const badgeValue = count > 0 ? count : undefined;

          console.log(`🏷️ Updating Home tab badge: ${badgeValue || 'hidden'}`);

          // Update the Home tab badge
          navigation.setOptions({
            tabBarBadge: badgeValue,
          });

          // For bottom tabs, we need to access the parent navigator
          const parent = navigation.getParent();
          if (parent) {
            parent.setOptions({
              tabBarBadge: badgeValue,
            });
          }

          lastUpdateRef.current = Date.now();
          previousCountRef.current = count;
        } catch (error) {
          console.error('❌ Failed to update tab badge:', error);
        }
      };

      if (timeSinceLastUpdate >= minDelay) {
        // Update immediately if enough time has passed
        animationFrameRef.current = requestAnimationFrame(performUpdate);
      } else {
        // Delay the update to meet minimum debounce time
        const remainingDelay = minDelay - timeSinceLastUpdate;
        updateTimeoutRef.current = setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(performUpdate);
        }, remainingDelay);
      }
    },
    [navigation]
  );

  // Effect to watch overdue count changes
  useEffect(() => {
    // Only update if count actually changed
    if (overdueCount !== previousCountRef.current) {
      console.log(
        `🔔 Overdue count changed: ${previousCountRef.current} → ${overdueCount}`
      );
      updateBadge(overdueCount);
    }
  }, [overdueCount, updateBadge]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Return current state for debugging/testing
  return {
    overdueCount,
    isVisible: overdueCount > 0,
  };
};

export default useOverdueBadge;
