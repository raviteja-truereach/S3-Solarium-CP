import { leadApi } from '../../src/store/api/leadApi';

describe('leadApi Backend Integration', () => {
  test('should transform quotation response correctly', () => {
    const mockBackendResponse = {
      success: true,
      data: {
        items: [
          {
            quotationId: 'QUOT-1013',
            leadId: 'LEAD-1012',
            systemKW: 7,
            totalCost: 490000,
            status: 'Accepted',
            createdAt: '2023-03-20T11:55:00Z',
          },
        ],
        total: 1,
        offset: 0,
        limit: 25,
      },
    };

    const endpoint = leadApi.endpoints.getQuotationsByLeadId;
    const result = endpoint.transformResponse(mockBackendResponse);

    expect(result).toEqual([
      {
        quotationId: 'QUOT-1013',
        leadId: 'LEAD-1012',
        systemKW: 7,
        totalCost: 490000,
        status: 'Accepted',
        createdAt: '2023-03-20T11:55:00Z',
      },
    ]);
  });

  test('should handle status update response correctly', () => {
    const mockBackendResponse = { success: true };

    const endpoint = leadApi.endpoints.updateLeadStatus;
    const result = endpoint.transformResponse(mockBackendResponse);

    expect(result).toEqual({ success: true });
  });

  test('should build correct URL for quotations with pagination', () => {
    const endpoint = leadApi.endpoints.getQuotationsByLeadId;

    // Test with all parameters
    expect(
      endpoint.query({ leadId: 'LEAD-1012', offset: 5, limit: 10 })
    ).toEqual({
      url: '/api/v1/quotations?leadId=LEAD-1012&offset=5&limit=10',
      method: 'GET',
    });

    // Test with defaults
    expect(endpoint.query({ leadId: 'LEAD-1012' })).toEqual({
      url: '/api/v1/quotations?leadId=LEAD-1012&offset=0&limit=25',
      method: 'GET',
    });
  });

  test('should handle empty quotations response', () => {
    const mockEmptyResponse = {
      success: true,
      data: {
        items: [],
        total: 0,
        offset: 0,
        limit: 25,
      },
    };

    const endpoint = leadApi.endpoints.getQuotationsByLeadId;
    const result = endpoint.transformResponse(mockEmptyResponse);

    expect(result).toEqual([]);
  });

  test('should handle quotation response error', () => {
    const mockErrorResponse = {
      success: false,
      data: {
        items: [],
        total: 0,
        offset: 0,
        limit: 25,
      },
    };

    const endpoint = leadApi.endpoints.getQuotationsByLeadId;

    expect(() => {
      endpoint.transformResponse(mockErrorResponse);
    }).toThrow('Failed to fetch quotations');
  });

  test('should handle status update error response', () => {
    const mockErrorResponse = { success: false };

    const endpoint = leadApi.endpoints.updateLeadStatus;

    expect(() => {
      endpoint.transformResponse(mockErrorResponse);
    }).toThrow('Failed to update lead status');
  });
});
