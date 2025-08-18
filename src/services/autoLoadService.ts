import type { AppDispatch } from '../store/types';

interface AutoLoadConfig {
  maxLeads?: number;
  batchSize?: number;
  maxPages?: number;
  delayBetweenBatches?: number;
}

export class AutoLoadService {
  private static instance: AutoLoadService;
  private isAutoLoading = false;
  private abortController: AbortController | null = null;

  static getInstance(): AutoLoadService {
    if (!AutoLoadService.instance) {
      AutoLoadService.instance = new AutoLoadService();
    }
    return AutoLoadService.instance;
  }

  /**
   * Auto-load pages until complete dataset or limits reached
   */
  async autoLoadPages(
    dispatch: AppDispatch,
    loadFunction: () => Promise<any>,
    canLoadMoreSelector: () => boolean,
    getCurrentCountSelector: () => number,
    config: AutoLoadConfig = {}
  ): Promise<void> {
    const {
      maxLeads = 500,
      batchSize = 20,
      maxPages = 25,
      delayBetweenBatches = 200,
    } = config;

    // Prevent multiple auto-loads
    if (this.isAutoLoading) {
      console.log('🔄 AutoLoad already in progress, skipping...');
      return;
    }

    this.isAutoLoading = true;
    this.abortController = new AbortController();

    console.log('🚀 AutoLoad started:', {
      maxLeads,
      batchSize,
      maxPages,
      currentCount: getCurrentCountSelector(),
    });

    try {
      let pagesLoaded = 0;
      let totalLoaded = getCurrentCountSelector();
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 3;

      while (
        canLoadMoreSelector() &&
        totalLoaded < maxLeads &&
        pagesLoaded < maxPages &&
        consecutiveFailures < maxConsecutiveFailures &&
        !this.abortController.signal.aborted
      ) {
        console.log(
          `🔄 AutoLoad page ${pagesLoaded + 1}, total leads: ${totalLoaded}`
        );

        const startTime = performance.now();
        const beforeCount = getCurrentCountSelector();

        try {
          await loadFunction();

          const afterCount = getCurrentCountSelector();
          const loadedInThisBatch = afterCount - beforeCount;

          const endTime = performance.now();
          console.log(
            `✅ AutoLoad batch completed: +${loadedInThisBatch} leads in ${(
              endTime - startTime
            ).toFixed(2)}ms`
          );

          if (loadedInThisBatch === 0) {
            console.log('⚠️ No new leads loaded, stopping auto-load');
            break;
          }

          totalLoaded = afterCount;
          pagesLoaded++;
          consecutiveFailures = 0; // Reset failure counter on success

          // Delay to prevent overwhelming the API
          if (delayBetweenBatches > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, delayBetweenBatches)
            );
          }
        } catch (error) {
          consecutiveFailures++;
          console.error(
            `❌ AutoLoad batch ${
              pagesLoaded + 1
            } failed (attempt ${consecutiveFailures}):`,
            error
          );

          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.error(
              '❌ Too many consecutive failures, stopping auto-load'
            );
            break;
          }

          // Wait longer before retrying after failure
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenBatches * 2)
          );
        }
      }

      const reason = this.abortController.signal.aborted
        ? 'aborted'
        : !canLoadMoreSelector()
        ? 'no more pages available'
        : totalLoaded >= maxLeads
        ? 'max leads limit reached'
        : pagesLoaded >= maxPages
        ? 'max pages limit reached'
        : consecutiveFailures >= maxConsecutiveFailures
        ? 'too many failures'
        : 'unknown';

      console.log('🏁 AutoLoad completed:', {
        reason,
        pagesLoaded,
        totalLoaded,
        canLoadMore: canLoadMoreSelector(),
        finalCount: getCurrentCountSelector(),
      });
    } catch (error) {
      console.error('❌ AutoLoad failed:', error);
    } finally {
      this.isAutoLoading = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing auto-load
   */
  cancelAutoLoad(): void {
    if (this.abortController && !this.abortController.signal.aborted) {
      console.log('🛑 AutoLoad cancelled');
      this.abortController.abort();
    }
  }

  /**
   * Check if auto-load is in progress
   */
  isLoading(): boolean {
    return this.isAutoLoading;
  }
}

export const autoLoadService = AutoLoadService.getInstance();
