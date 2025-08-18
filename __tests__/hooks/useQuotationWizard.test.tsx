/**
 * useQuotationWizard Hook Tests
 * Testing quotation wizard state management
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useQuotationWizard } from '../../src/hooks/useQuotationWizard';
import quotationSlice from '../../src/store/slices/quotationSlice';
import type { QuotationWizardData } from '../../src/types/quotation';

const createMockStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      quotation: quotationSlice,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useQuotationWizard', () => {
  it('should initialize with default state', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(1);
    expect(result.current.data).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(false);
    expect(result.current.isCreating).toBe(false);
  });

  it('should start wizard for a lead', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    act(() => {
      result.current.startForLead('LEAD-456');
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(1);
    expect(result.current.data).toEqual({ leadId: 'LEAD-456' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(false);
    expect(result.current.isCreating).toBe(false);
  });

  it('should navigate between steps', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    // Start wizard first
    act(() => {
      result.current.startForLead('LEAD-456');
    });

    // Go to next step
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(2);

    // Go to previous step
    act(() => {
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe(1);

    // Go to specific step
    act(() => {
      result.current.goToStep(5);
    });

    expect(result.current.currentStep).toBe(5);
  });

  it('should not go beyond step boundaries', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 7,
          leadId: 'LEAD-456',
          data: {},
          errors: {},
          isValid: false,
          creating: false,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    // Try to go beyond step 7
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(7);

    // Set to step 1 and try to go before
    act(() => {
      result.current.goToStep(1);
    });

    act(() => {
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe(1);
  });

  it('should update wizard data', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    const wizardData: Partial<QuotationWizardData> = {
      location: {
        state: 'Maharashtra',
        discom: 'MSEDCL',
        phase: 'Single',
        hasSmartMeter: true,
      },
    };

    act(() => {
      result.current.updateData(wizardData);
    });

    expect(result.current.data.location).toEqual(wizardData.location);
  });

  it('should merge wizard data with existing data', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 2,
          leadId: 'LEAD-456',
          data: {
            leadId: 'LEAD-456',
            location: { state: 'Gujarat' },
          },
          errors: {},
          isValid: false,
          creating: false,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

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

    act(() => {
      result.current.updateData(newData);
    });

    expect(result.current.data.leadId).toBe('LEAD-456'); // Should preserve
    expect(result.current.data.location?.state).toBe('Gujarat'); // Should preserve
    expect(result.current.data.panels).toEqual(newData.panels); // Should add new
  });

  it('should handle wizard errors', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    const errors = {
      location: 'State is required',
      panels: 'At least one panel is required',
    };

    act(() => {
      result.current.setErrors(errors);
    });

    expect(result.current.errors).toEqual(errors);
  });

  it('should handle wizard validation state', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    act(() => {
      result.current.setValid(true);
    });

    expect(result.current.isValid).toBe(true);
  });

  it('should clear wizard state', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 5,
          leadId: 'LEAD-456',
          data: { leadId: 'LEAD-456', location: { state: 'Maharashtra' } },
          errors: { location: 'Error' },
          isValid: true,
          creating: true,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    act(() => {
      result.current.clearWizardState();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(1);
    expect(result.current.data).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(false);
    expect(result.current.isCreating).toBe(false);
  });

  it('should provide progress information', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 3,
          leadId: 'LEAD-456',
          data: {},
          errors: {},
          isValid: true,
          creating: false,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    expect(result.current.progress.currentStep).toBe(3);
    expect(result.current.progress.totalSteps).toBe(7);
    expect(result.current.progress.progress).toBe(Math.round((3 / 7) * 100));
    expect(result.current.progress.canProceed).toBe(true);
  });

  it('should validate step navigation permissions', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 3,
          leadId: 'LEAD-456',
          data: {},
          errors: {},
          isValid: true,
          creating: false,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    // Can go to previous steps
    expect(result.current.canGoToStep(1)).toBe(true);
    expect(result.current.canGoToStep(2)).toBe(true);
    expect(result.current.canGoToStep(3)).toBe(true);

    // Can go to next step if valid
    expect(result.current.canGoToStep(4)).toBe(true);

    // Cannot skip steps
    expect(result.current.canGoToStep(6)).toBe(false);
  });

  it('should not allow step navigation when invalid', () => {
    const store = createMockStore({
      quotation: {
        wizard: {
          isActive: true,
          currentStep: 3,
          leadId: 'LEAD-456',
          data: {},
          errors: {},
          isValid: false, // Invalid
          creating: false,
        },
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    // Can still go to previous or current steps
    expect(result.current.canGoToStep(1)).toBe(true);
    expect(result.current.canGoToStep(3)).toBe(true);

    // Cannot go to next step when invalid
    expect(result.current.canGoToStep(4)).toBe(false);
  });

  it('should provide step information', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    expect(result.current.getStepTitle(1)).toBe('Location Details');
    expect(result.current.getStepTitle(2)).toBe('Solar Panels');
    expect(result.current.getStepTitle(7)).toBe('Review & Generate');

    expect(result.current.getStepDescription(1)).toBe(
      'Select state, DISCOM, and phase'
    );
    expect(result.current.getStepDescription(2)).toBe(
      'Choose panels and system capacity'
    );
    expect(result.current.getStepDescription(7)).toBe(
      'Final review and quotation generation'
    );
  });

  it('should handle unknown step titles gracefully', () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotationWizard(), { wrapper });

    expect(result.current.getStepTitle(99 as any)).toBe('Step 99');
    expect(result.current.getStepDescription(99 as any)).toBe('');
  });
});
