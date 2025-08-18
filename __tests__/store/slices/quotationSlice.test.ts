/**
 * Quotation Slice Tests
 * Unit tests for quotation Redux slice following leadSlice patterns
 */
import quotationReducer, {
  upsertQuotations,
  updateQuotationStatus,
  setLoading,
  setLoadingNext,
  setError,
  setSearchText,
  setFilters,
  clearQuotations,
  setLastSync,
  setSummaryData,
  startWizard,
  setWizardStep,
  updateWizardData,
  setWizardErrors,
  setWizardValid,
  setWizardCreating,
  clearWizard,
  cacheQuotationDetail,
  QuotationState,
  UpsertQuotationsPayload,
} from '../../../src/store/slices/quotationSlice';
import type { Quotation } from '../../../src/types/api/quotation';
import type { QuotationWizardData } from '../../../src/types/quotation';

describe('quotationSlice', () => {
  const initialState: QuotationState = {
    items: {},
    pagesLoaded: [],
    totalPages: 0,
    totalCount: 0,
    loadingNext: false,
    hasMore: true,
    lastSync: null,
    isLoading: false,
    error: null,
    searchText: '',
    filters: {
      statuses: [],
      leadId: undefined,
      dateRange: undefined,
    },
    summaryData: undefined,
    wizard: {
      isActive: false,
      currentStep: 1,
      leadId: null,
      data: {},
      errors: {},
      isValid: false,
      creating: false,
    },
    quotationDetails: {},
  };

  const mockQuotation: Quotation = {
    quotationId: 'QUOT-123',
    leadId: 'LEAD-456',
    systemKW: 5,
    totalCost: 350000,
    status: 'Generated',
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should return initial state', () => {
    expect(quotationReducer(undefined, { type: 'unknown' })).toEqual(
      initialState
    );
  });

  describe('quotation data management', () => {
    it('should handle upsertQuotations', () => {
      const payload: UpsertQuotationsPayload = {
        items: [mockQuotation],
        page: 1,
        totalPages: 1,
        totalCount: 1,
      };

      const actual = quotationReducer(initialState, upsertQuotations(payload));

      expect(actual.items[mockQuotation.quotationId]).toEqual(mockQuotation);
      expect(actual.pagesLoaded).toContain(1);
      expect(actual.totalPages).toBe(1);
      expect(actual.totalCount).toBe(1);
      expect(actual.hasMore).toBe(false);
    });

    it('should handle upsertQuotations with existing data', () => {
      const existingState: QuotationState = {
        ...initialState,
        items: { 'QUOT-456': { ...mockQuotation, quotationId: 'QUOT-456' } },
        pagesLoaded: [1],
      };

      const newQuotation: Quotation = {
        ...mockQuotation,
        quotationId: 'QUOT-789',
        totalCost: 400000,
      };

      const payload: UpsertQuotationsPayload = {
        items: [newQuotation],
        page: 2,
        totalPages: 2,
        totalCount: 2,
      };

      const actual = quotationReducer(existingState, upsertQuotations(payload));

      expect(actual.items['QUOT-456']).toBeDefined();
      expect(actual.items['QUOT-789']).toEqual(newQuotation);
      expect(actual.pagesLoaded).toEqual([1, 2]);
      expect(actual.hasMore).toBe(false);
    });

    it('should handle updateQuotationStatus', () => {
      const stateWithQuotation: QuotationState = {
        ...initialState,
        items: { [mockQuotation.quotationId]: mockQuotation },
        quotationDetails: {
          [mockQuotation.quotationId]: {
            ...mockQuotation,
            components: {},
            pricing: {},
          },
        },
      };

      const actual = quotationReducer(
        stateWithQuotation,
        updateQuotationStatus({
          quotationId: 'QUOT-123',
          status: 'Shared',
          timestamp: '2024-01-02T00:00:00Z',
        })
      );

      expect(actual.items['QUOT-123'].status).toBe('Shared');
      expect(actual.quotationDetails['QUOT-123'].status).toBe('Shared');
      expect(actual.quotationDetails['QUOT-123'].sharedAt).toBe(
        '2024-01-02T00:00:00Z'
      );
    });

    it('should handle clearQuotations', () => {
      const stateWithData: QuotationState = {
        ...initialState,
        items: { [mockQuotation.quotationId]: mockQuotation },
        pagesLoaded: [1],
        totalPages: 1,
        totalCount: 1,
      };

      const actual = quotationReducer(stateWithData, clearQuotations());

      expect(actual.items).toEqual({});
      expect(actual.pagesLoaded).toEqual([]);
      expect(actual.totalPages).toBe(0);
      expect(actual.totalCount).toBe(0);
      expect(actual.hasMore).toBe(true);
    });
  });

  describe('loading and error states', () => {
    it('should handle setLoading', () => {
      const actual = quotationReducer(initialState, setLoading(true));
      expect(actual.isLoading).toBe(true);
    });

    it('should handle setLoadingNext', () => {
      const actual = quotationReducer(initialState, setLoadingNext(true));
      expect(actual.loadingNext).toBe(true);
    });

    it('should handle setError', () => {
      const errorMessage = 'Failed to load quotations';
      const actual = quotationReducer(initialState, setError(errorMessage));

      expect(actual.error).toBe(errorMessage);
      expect(actual.isLoading).toBe(false);
      expect(actual.loadingNext).toBe(false);
    });

    it('should clear error when setLoading(true) is called', () => {
      const stateWithError: QuotationState = {
        ...initialState,
        error: 'Previous error',
      };

      const actual = quotationReducer(stateWithError, setLoading(true));

      expect(actual.isLoading).toBe(true);
      expect(actual.error).toBeNull();
    });
  });

  describe('filtering and search', () => {
    it('should handle setSearchText', () => {
      const searchText = 'QUOT-123';
      const actual = quotationReducer(initialState, setSearchText(searchText));
      expect(actual.searchText).toBe(searchText);
    });

    it('should handle setFilters', () => {
      const filters = { statuses: ['Generated', 'Shared'], leadId: 'LEAD-456' };
      const actual = quotationReducer(initialState, setFilters(filters));

      expect(actual.filters.statuses).toEqual(['Generated', 'Shared']);
      expect(actual.filters.leadId).toBe('LEAD-456');
    });

    it('should handle partial filter updates', () => {
      const stateWithFilters: QuotationState = {
        ...initialState,
        filters: {
          statuses: ['Generated'],
          leadId: 'LEAD-123',
          dateRange: undefined,
        },
      };

      const actual = quotationReducer(
        stateWithFilters,
        setFilters({ statuses: ['Shared', 'Accepted'] })
      );

      expect(actual.filters.statuses).toEqual(['Shared', 'Accepted']);
      expect(actual.filters.leadId).toBe('LEAD-123'); // Should preserve existing
    });
  });

  describe('summary data', () => {
    it('should handle setSummaryData', () => {
      const summaryData = {
        generated: 5,
        shared: 3,
        accepted: 2,
        rejected: 1,
        total: 11,
      };

      const actual = quotationReducer(
        initialState,
        setSummaryData(summaryData)
      );
      expect(actual.summaryData).toEqual(summaryData);
    });

    it('should handle setLastSync', () => {
      const timestamp = Date.now();
      const actual = quotationReducer(initialState, setLastSync(timestamp));
      expect(actual.lastSync).toBe(timestamp);
    });
  });

  describe('wizard management', () => {
    it('should handle startWizard', () => {
      const actual = quotationReducer(
        initialState,
        startWizard({ leadId: 'LEAD-456' })
      );

      expect(actual.wizard.isActive).toBe(true);
      expect(actual.wizard.currentStep).toBe(1);
      expect(actual.wizard.leadId).toBe('LEAD-456');
      expect(actual.wizard.data).toEqual({ leadId: 'LEAD-456' });
      expect(actual.wizard.errors).toEqual({});
      expect(actual.wizard.isValid).toBe(false);
      expect(actual.wizard.creating).toBe(false);
    });

    it('should handle setWizardStep', () => {
      const stateWithActiveWizard: QuotationState = {
        ...initialState,
        wizard: { ...initialState.wizard, isActive: true },
      };

      const actual = quotationReducer(stateWithActiveWizard, setWizardStep(3));
      expect(actual.wizard.currentStep).toBe(3);
    });

    it('should handle updateWizardData', () => {
      const wizardData: Partial<QuotationWizardData> = {
        location: {
          state: 'Maharashtra',
          discom: 'MSEDCL',
          phase: 'Single',
          hasSmartMeter: true,
        },
      };

      const actual = quotationReducer(
        initialState,
        updateWizardData(wizardData)
      );

      expect(actual.wizard.data.location).toEqual(wizardData.location);
    });

    it('should merge wizard data with existing data', () => {
      const stateWithWizardData: QuotationState = {
        ...initialState,
        wizard: {
          ...initialState.wizard,
          data: {
            leadId: 'LEAD-456',
            location: { state: 'Gujarat' },
          },
        },
      };

      const newData: Partial<QuotationWizardData> = {
        panels: {
          selectedPanels: [
            {
              panelId: 'PNL001',
              make: 'Tata',
              variant: 'TP540M',
              wattage: 540,
              quantity: 10,
              unitPrice: 15000,
              isDCR: true,
            },
          ],
          totalCapacityKW: 5.4,
        },
      };

      const actual = quotationReducer(
        stateWithWizardData,
        updateWizardData(newData)
      );

      expect(actual.wizard.data.leadId).toBe('LEAD-456'); // Should preserve existing
      expect(actual.wizard.data.location?.state).toBe('Gujarat'); // Should preserve existing
      expect(actual.wizard.data.panels).toEqual(newData.panels); // Should add new
    });

    it('should handle setWizardErrors', () => {
      const errors = {
        location: 'State is required',
        panels: 'At least one panel is required',
      };
      const actual = quotationReducer(initialState, setWizardErrors(errors));
      expect(actual.wizard.errors).toEqual(errors);
    });

    it('should handle setWizardValid', () => {
      const actual = quotationReducer(initialState, setWizardValid(true));
      expect(actual.wizard.isValid).toBe(true);
    });

    it('should handle setWizardCreating', () => {
      const actual = quotationReducer(initialState, setWizardCreating(true));
      expect(actual.wizard.creating).toBe(true);
    });

    it('should handle clearWizard', () => {
      const stateWithActiveWizard: QuotationState = {
        ...initialState,
        wizard: {
          isActive: true,
          currentStep: 5,
          leadId: 'LEAD-456',
          data: { leadId: 'LEAD-456', location: { state: 'Maharashtra' } },
          errors: { location: 'Error' },
          isValid: true,
          creating: true,
        },
      };

      const actual = quotationReducer(stateWithActiveWizard, clearWizard());
      expect(actual.wizard).toEqual(initialState.wizard);
    });
  });

  describe('quotation details caching', () => {
    it('should handle cacheQuotationDetail', () => {
      const quotationDetail = {
        quotationId: 'QUOT-123',
        components: { panels: [], inverters: [] },
        pricing: { total: 350000 },
      };

      const actual = quotationReducer(
        initialState,
        cacheQuotationDetail({ quotationId: 'QUOT-123', data: quotationDetail })
      );

      expect(actual.quotationDetails['QUOT-123']).toEqual(quotationDetail);
    });
  });

  describe('edge cases', () => {
    it('should handle updateQuotationStatus for non-existent quotation', () => {
      const actual = quotationReducer(
        initialState,
        updateQuotationStatus({ quotationId: 'NON-EXISTENT', status: 'Shared' })
      );

      // Should not crash and state should remain unchanged
      expect(actual.items).toEqual({});
    });

    it('should handle multiple upserts with same quotation ID', () => {
      const firstPayload: UpsertQuotationsPayload = {
        items: [mockQuotation],
        page: 1,
        totalPages: 1,
        totalCount: 1,
      };

      const updatedQuotation: Quotation = {
        ...mockQuotation,
        totalCost: 400000,
        status: 'Shared',
      };

      const secondPayload: UpsertQuotationsPayload = {
        items: [updatedQuotation],
        page: 1,
        totalPages: 1,
        totalCount: 1,
      };

      let state = quotationReducer(
        initialState,
        upsertQuotations(firstPayload)
      );
      state = quotationReducer(state, upsertQuotations(secondPayload));

      expect(state.items[mockQuotation.quotationId]).toEqual(updatedQuotation);
      expect(state.pagesLoaded).toEqual([1]); // Should not duplicate pages
    });
  });
});
