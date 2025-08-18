/**
 * Mock service for document count management
 * Simulates backend API calls for document counting during development
 */

/** In-memory storage for document counts by lead ID */
const documentCounts = new Map<string, number>();

/** Simulated network delay range */
const NETWORK_DELAY_MIN = 300;
const NETWORK_DELAY_MAX = 800;

/**
 * Simulates network delay for realistic testing
 */
const simulateNetworkDelay = (): Promise<void> => {
  const delay =
    Math.random() * (NETWORK_DELAY_MAX - NETWORK_DELAY_MIN) + NETWORK_DELAY_MIN;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Mock service for document operations
 */
export const documentMockService = {
  /**
   * Get document count for a lead
   * @param leadId - Lead identifier
   * @returns Promise resolving to document count
   */
  async getDocumentCount(leadId: string): Promise<number> {
    console.log(`[Mock] Fetching document count for lead ${leadId}`);
    await simulateNetworkDelay();

    const count = documentCounts.get(leadId) || 0;
    console.log(`[Mock] Document count for lead ${leadId}: ${count}`);
    return count;
  },

  /**
   * Set document count for a lead
   * @param leadId - Lead identifier
   * @param count - New document count
   */
  async setDocumentCount(leadId: string, count: number): Promise<void> {
    console.log(`[Mock] Setting document count for lead ${leadId} to ${count}`);
    await simulateNetworkDelay();

    documentCounts.set(leadId, count);
    console.log(`[Mock] Document count updated for lead ${leadId}`);
  },

  /**
   * Increment document count for a lead
   * @param leadId - Lead identifier
   * @param increment - Amount to increment (default: 1)
   * @returns Promise resolving to new count
   */
  async incrementDocumentCount(
    leadId: string,
    increment: number = 1
  ): Promise<number> {
    console.log(
      `[Mock] Incrementing document count for lead ${leadId} by ${increment}`
    );
    await simulateNetworkDelay();

    const currentCount = documentCounts.get(leadId) || 0;
    const newCount = currentCount + increment;
    documentCounts.set(leadId, newCount);

    console.log(
      `[Mock] Document count for lead ${leadId}: ${currentCount} → ${newCount}`
    );
    return newCount;
  },

  /**
   * Reset document count for a lead
   * @param leadId - Lead identifier
   */
  async resetDocumentCount(leadId: string): Promise<void> {
    console.log(`[Mock] Resetting document count for lead ${leadId}`);
    await simulateNetworkDelay();

    documentCounts.delete(leadId);
    console.log(`[Mock] Document count reset for lead ${leadId}`);
  },

  /**
   * Get all document counts (for debugging)
   * @returns Map of lead IDs to document counts
   */
  getAllCounts(): Map<string, number> {
    return new Map(documentCounts);
  },

  /**
   * Clear all document counts (for testing)
   */
  clearAllCounts(): void {
    console.log('[Mock] Clearing all document counts');
    documentCounts.clear();
  },
};
