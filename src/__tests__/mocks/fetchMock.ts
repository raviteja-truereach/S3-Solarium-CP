/**
 * Enhanced Fetch Mock for Lead API Testing
 * Supports paged responses, envelope variants, and error scenarios
 */

export interface MockLeadApiResponse {
  success: boolean;
  message?: string;
  data: {
    items: any[];
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Generate mock API lead data
 */
export const createMockApiLead = (id: string, overrides: any = {}) => ({
  leadId: id,
  customerName: `Customer ${id}`,
  phone: `+91${Math.random().toString().slice(2, 12)}`,
  address: `Address for ${id}`,
  status: 'New Lead',
  services: ['SRV001'],
  assignedTo: 'CP-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Generate paged response data
 */
export const createPagedResponse = (
  page: number,
  limit: number,
  totalRecords: number,
  leadOverrides: any = {}
): MockLeadApiResponse => {
  const offset = (page - 1) * limit;
  const remainingRecords = Math.max(0, totalRecords - offset);
  const recordsInPage = Math.min(limit, remainingRecords);

  const items = Array.from({ length: recordsInPage }, (_, i) =>
    createMockApiLead(
      `LEAD-${String(offset + i + 1).padStart(3, '0')}`,
      leadOverrides
    )
  );

  return {
    success: true,
    data: {
      items,
      total: totalRecords,
      offset,
      limit,
    },
  };
};

/**
 * Mock fetch responses for different scenarios
 */
export class LeadApiFetchMock {
  private responses: Map<string, any> = new Map();
  private callCount = 0;
  private shouldFail = false;
  private failureReason: 'network' | 'server' | 'auth' | 'validation' =
    'network';

  constructor() {
    this.setupMockFetch();
  }

  /**
   * Set up standard 3-page scenario (60 total leads)
   */
  setupStandard3PageScenario(): void {
    this.responses.clear();

    // Page 1: 25 leads
    this.responses.set(
      '/api/v1/leads?offset=0&limit=25',
      createPagedResponse(1, 25, 60)
    );

    // Page 2: 25 leads
    this.responses.set(
      '/api/v1/leads?offset=25&limit=25',
      createPagedResponse(2, 25, 60)
    );

    // Page 3: 10 leads (remaining)
    this.responses.set(
      '/api/v1/leads?offset=50&limit=25',
      createPagedResponse(3, 25, 60)
    );
  }

  /**
   * Set up single page scenario
   */
  setupSinglePageScenario(totalLeads: number = 15): void {
    this.responses.clear();

    this.responses.set(
      '/api/v1/leads?offset=0&limit=25',
      createPagedResponse(1, 25, totalLeads)
    );
  }

  /**
   * Set up empty response scenario
   */
  setupEmptyScenario(): void {
    this.responses.clear();

    this.responses.set('/api/v1/leads?offset=0&limit=25', {
      success: true,
      data: {
        items: [],
        total: 0,
        offset: 0,
        limit: 25,
      },
    });
  }

  /**
   * Set up failure scenario
   */
  setupFailureScenario(
    reason: 'network' | 'server' | 'auth' | 'validation' = 'network'
  ): void {
    this.shouldFail = true;
    this.failureReason = reason;
  }

  /**
   * Set up mixed valid/invalid data scenario
   */
  setupMixedValidityScenario(): void {
    this.responses.clear();

    const mixedItems = [
      // Valid lead
      createMockApiLead('LEAD-001'),
      // Invalid lead - missing required fields
      {
        leadId: 'LEAD-002',
        status: 'Invalid Status',
        // Missing customerName, phone, address, etc.
      },
      // Valid lead
      createMockApiLead('LEAD-003'),
      // Invalid lead - wrong data types
      {
        leadId: 'LEAD-004',
        customerName: 123, // Should be string
        phone: null,
        address: undefined,
        status: 'New Lead',
        services: 'not-an-array', // Should be array
        assignedTo: 'CP-001',
        createdAt: 'invalid-date',
        updatedAt: new Date().toISOString(),
      },
    ];

    this.responses.set('/api/v1/leads?offset=0&limit=25', {
      success: true,
      data: {
        items: mixedItems,
        total: 4,
        offset: 0,
        limit: 25,
      },
    });
  }

  /**
   * Set up custom response for specific URL
   */
  setResponse(url: string, response: any): void {
    const cleanUrl = url.replace(/^https?:\/\/[^\/]+/, '');
    this.responses.set(cleanUrl, response);
  }

  /**
   * Get call count for testing
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.responses.clear();
    this.callCount = 0;
    this.shouldFail = false;
    this.failureReason = 'network';
  }

  /**
   * Setup mock fetch implementation
   */
  private setupMockFetch(): void {
    global.fetch = jest
      .fn()
      .mockImplementation(async (url: string, options?: any) => {
        this.callCount++;

        const cleanUrl = url.replace(/^https?:\/\/[^\/]+/, '');
        console.log(`Mock fetch call ${this.callCount}: ${cleanUrl}`);

        // Simulate failure scenarios
        if (this.shouldFail) {
          switch (this.failureReason) {
            case 'network':
              throw new Error('Network request failed');
            case 'server':
              return Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: 'Server error' }),
              });
            case 'auth':
              return Promise.resolve({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: 'Authentication failed' }),
              });
            case 'validation':
              return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => ({
                  success: false,
                  message: 'Validation failed',
                  data: null,
                }),
              });
          }
        }

        // Return mock response if available
        const response = this.responses.get(cleanUrl);
        if (response) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => response,
          });
        }

        // Default fallback
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: 'Mock response not configured' }),
        });
      });
  }
}

/**
 * Global mock instance
 */
export const leadApiFetchMock = new LeadApiFetchMock();

/**
 * Jest setup helper
 */
export const setupLeadApiMocks = () => {
  beforeEach(() => {
    leadApiFetchMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
};
