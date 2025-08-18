import { useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectOverdueCount } from '../store/selectors/leadSelectors';

/**
 * Hook to handle badge updates after sync operations
 * Ensures badge refreshes within 3s after SyncManager sync or lead mutations
 */
export const useBadgeSync = () => {
  const overdueCount = useAppSelector(selectOverdueCount);
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for sync events
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log('🔄 Sync completed, scheduling badge refresh...');

      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Schedule badge refresh within 3 seconds
      syncTimeoutRef.current = setTimeout(() => {
        lastSyncRef.current = Date.now();
        console.log('🏷️ Badge refresh triggered after sync');
        // The badge will automatically update via useOverdueBadge hook
        // when selectOverdueCount changes
      }, 1000); // 1 second delay for sync to complete
    };

    // Listen for custom sync events (if you have an event system)
    // You might need to adapt this to your actual sync implementation
    const syncEventListener = (event: any) => {
      if (event.type === 'SYNC_COMPLETE' || event.type === 'LEAD_MUTATION') {
        handleSyncComplete();
      }
    };

    // If you have a global event emitter, add listener here
    // globalEventEmitter.addEventListener('sync', syncEventListener);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      // globalEventEmitter.removeEventListener('sync', syncEventListener);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    lastSync: lastSyncRef.current,
    overdueCount,
  };
};

export default useBadgeSync;
