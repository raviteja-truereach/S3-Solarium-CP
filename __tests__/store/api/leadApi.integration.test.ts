import { leadApi } from '../../../src/store/api/leadApi';

describe('leadApi ST-06-1 Integration', () => {
  test('should export quotation query hook', () => {
    expect(typeof leadApi.endpoints.getQuotationsByLeadId).toBe('object');
    expect(typeof leadApi.endpoints.getQuotationsByLeadId.initiate).toBe(
      'function'
    );
  });

  test('should have correct quotation query configuration', () => {
    const endpoint = leadApi.endpoints.getQuotationsByLeadId;
    const queryParams = { leadId: 'LEAD-123', offset: 0, limit: 25 };

    expect(endpoint.query(queryParams)).toEqual({
      url: '/api/v1/quotations?leadId=LEAD-123&offset=0&limit=25',
      method: 'GET',
    });
  });

  test('should handle quotation query with default pagination', () => {
    const endpoint = leadApi.endpoints.getQuotationsByLeadId;
    const queryParams = { leadId: 'LEAD-123' };

    expect(endpoint.query(queryParams)).toEqual({
      url: '/api/v1/quotations?leadId=LEAD-123&offset=0&limit=25',
      method: 'GET',
    });
  });

  test('should have optimistic update in status mutation', () => {
    const endpoint = leadApi.endpoints.updateLeadStatus;
    expect(typeof endpoint.onQueryStarted).toBe('function');
  });

  test('should invalidate correct tags on status update', () => {
    const endpoint = leadApi.endpoints.updateLeadStatus;
    const tags = endpoint.invalidatesTags?.({}, null, { leadId: 'LEAD-123' });

    expect(tags).toEqual([
      'LeadList',
      { type: 'Lead', id: 'LEAD-123' },
      { type: 'QuotationsByLead', id: 'LEAD-123' },
    ]);
  });

  test('should handle simple backend response for status update', () => {
    const endpoint = leadApi.endpoints.updateLeadStatus;
    const mockResponse = { success: true };

    const result = endpoint.transformResponse(mockResponse);
    expect(result).toEqual(mockResponse);
  });
});
