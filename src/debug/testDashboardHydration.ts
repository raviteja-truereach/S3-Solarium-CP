import { getSyncManager } from '../sync/SyncManager';
import { store } from '../store';
import { selectDashboardSummary } from '../store/slices/networkSlice';

export const testDashboardHydration = async () => {
  console.log('Testing dashboard summary hydration...');

  // Check initial state
  const initialSummary = selectDashboardSummary(store.getState());
  console.log('Initial dashboard summary:', initialSummary);

  // Trigger sync
  const syncManager = getSyncManager();
  const result = await syncManager.manualSync('manual');

  console.log('Sync result:', result);

  // Check final state
  const finalSummary = selectDashboardSummary(store.getState());
  console.log('Final dashboard summary:', finalSummary);

  return { success: finalSummary !== null, summary: finalSummary };
};
