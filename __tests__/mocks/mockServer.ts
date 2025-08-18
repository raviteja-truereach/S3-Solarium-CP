/**
 * Mock Server for Testing Different Response Scenarios
 * Simulates 2xx, 4xx, 5xx responses and delayed failures
 */

export interface MockResponse {
  status: number;
  data?: any;
  error?: string;
  delay?: number;
}

export class MockServer {
  private responses: Map<string, MockResponse> = new Map();
  private defaultResponse: MockResponse = {
    status: 200,
    data: { success: true },
  };

  /**
   * Set mock response for specific endpoint
   */
  setResponse(endpoint: string, response: MockResponse): void {
    this.responses.set(endpoint, response);
  }

  /**
   * Set default response for unmatched endpoints
   */
  setDefaultResponse(response: MockResponse): void {
    this.defaultResponse = response;
  }

  /**
   * Clear all mock responses
   */
  clear(): void {
    this.responses.clear();
  }

  /**
   * Get mock fetch implementation
   */
  getMockFetch(): jest.MockedFunction<typeof fetch> {
    return jest.fn().mockImplementation(async (url: string, options?: any) => {
      const endpoint = this.extractEndpoint(url);
      const mockResponse = this.responses.get(endpoint) || this.defaultResponse;

      // Simulate network delay
      if (mockResponse.delay) {
        await new Promise((resolve) => setTimeout(resolve, mockResponse.delay));
      }

      // Simulate network errors
      if (mockResponse.status === 0) {
        throw new Error('Network error');
      }

      // Simulate timeout
      if (mockResponse.status === -1) {
        throw new Error('Request timeout');
      }

      const response = {
        ok: mockResponse.status >= 200 && mockResponse.status < 300,
        status: mockResponse.status,
        statusText: this.getStatusText(mockResponse.status),
        json: async () => mockResponse.data || mockResponse.error || {},
        text: async () =>
          JSON.stringify(mockResponse.data || mockResponse.error || {}),
      };

      return response as Response;
    });
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return statusTexts[status] || 'Unknown';
  }

  /**
   * Preset scenarios for common test cases
   */
  static getPresetScenarios() {
    return {
      // Success scenarios
      successfulStatusUpdate: {
        status: 200,
        data: { success: true },
      },

      successfulQuotationFetch: {
        status: 200,
        data: {
          success: true,
          data: {
            items: [
              {
                quotationId: 'QUOT-123',
                leadId: 'LEAD-456',
                systemKW: 5,
                totalCost: 350000,
                status: 'Generated',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            total: 1,
            offset: 0,
            limit: 25,
          },
        },
      },

      // Error scenarios
      validationError: {
        status: 400,
        error: {
          success: false,
          error: 'Bad Request',
          message: 'Invalid status transition',
          code: 'VALIDATION_ERROR',
        },
      },

      unauthorized: {
        status: 401,
        error: {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
      },

      conflictError: {
        status: 409,
        error: {
          success: false,
          error: 'Conflict',
          message: 'Lead has been updated by another user',
        },
      },

      serverError: {
        status: 500,
        error: {
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        },
      },

      // Network scenarios
      networkError: {
        status: 0, // Special status for network errors
      },

      timeout: {
        status: -1, // Special status for timeouts
      },

      slowResponse: {
        status: 200,
        data: { success: true },
        delay: 2000, // 2 second delay
      },

      // Empty data scenarios
      emptyQuotations: {
        status: 200,
        data: {
          success: true,
          data: {
            items: [],
            total: 0,
            offset: 0,
            limit: 25,
          },
        },
      },
    };
  }
}

// Export singleton instance
export const mockServer = new MockServer();

// Helper function to setup mock fetch with scenarios
export function setupMockFetch(
  scenarios: Record<string, MockResponse> = {}
): jest.MockedFunction<typeof fetch> {
  mockServer.clear();

  Object.entries(scenarios).forEach(([endpoint, response]) => {
    mockServer.setResponse(endpoint, response);
  });

  const mockFetch = mockServer.getMockFetch();
  global.fetch = mockFetch;

  return mockFetch;
}
