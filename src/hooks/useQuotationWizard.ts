/**
 * Quotation Wizard Hook
 * Manages quotation wizard state and navigation
 */
import { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import {
  selectWizardState,
  selectWizardProgress,
} from '../store/selectors/quotationSelectors';
import {
  startWizard,
  setWizardStep,
  updateWizardData,
  setWizardErrors,
  setWizardValid,
  clearWizard,
} from '../store/slices/quotationSlice';
import type {
  QuotationWizardData,
  QuotationWizardStep,
} from '../types/quotation';

interface UseQuotationWizardResult {
  // Current state
  isActive: boolean;
  currentStep: QuotationWizardStep;
  data: Partial<QuotationWizardData>;
  errors: Record<string, string>;
  isValid: boolean;
  isCreating: boolean;

  // Progress information
  progress: {
    currentStep: number;
    totalSteps: number;
    progress: number;
    isComplete: boolean;
    canProceed: boolean;
  };

  // Navigation functions
  startForLead: (leadId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: QuotationWizardStep) => void;

  // Data management functions
  updateData: (data: Partial<QuotationWizardData>) => void;
  setErrors: (errors: Record<string, string>) => void;
  setValid: (isValid: boolean) => void;

  // Wizard lifecycle
  clearWizardState: () => void;

  // Validation helpers
  canGoToStep: (step: QuotationWizardStep) => boolean;
  getStepTitle: (step: QuotationWizardStep) => string;
  getStepDescription: (step: QuotationWizardStep) => string;
}

/**
 * Step configuration
 */
const STEP_CONFIG = {
  1: {
    title: 'Location Details',
    description: 'Select state, DISCOM, and phase',
  },
  2: {
    title: 'Solar Panels',
    description: 'Choose panels and system capacity',
  },
  3: {
    title: 'Inverter & BOM',
    description: 'Select inverter and additional components',
  },
  4: { title: 'Fees Lookup', description: 'View installation and DISCOM fees' },
  5: { title: 'Dealer Add-on', description: 'Set dealer margin per kW' },
  6: {
    title: 'Pricing & Subsidy',
    description: 'Review pricing and subsidy calculations',
  },
  7: {
    title: 'Review & Generate',
    description: 'Final review and quotation generation',
  },
};

/**
 * Hook for quotation wizard management
 */
export const useQuotationWizard = (): UseQuotationWizardResult => {
  const dispatch = useAppDispatch();
  const wizardState = useAppSelector(selectWizardState);
  const progress = useAppSelector(selectWizardProgress);

  // Navigation functions
  const startForLead = useCallback(
    (leadId: string) => {
      dispatch(startWizard({ leadId }));
    },
    [dispatch]
  );

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < 7) {
      dispatch(
        setWizardStep((wizardState.currentStep + 1) as QuotationWizardStep)
      );
    }
  }, [dispatch, wizardState.currentStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 1) {
      dispatch(
        setWizardStep((wizardState.currentStep - 1) as QuotationWizardStep)
      );
    }
  }, [dispatch, wizardState.currentStep]);

  const goToStep = useCallback(
    (step: QuotationWizardStep) => {
      dispatch(setWizardStep(step));
    },
    [dispatch]
  );

  // Data management functions
  const updateData = useCallback(
    (data: Partial<QuotationWizardData>) => {
      dispatch(updateWizardData(data));
    },
    [dispatch]
  );

  const setErrors = useCallback(
    (errors: Record<string, string>) => {
      dispatch(setWizardErrors(errors));
    },
    [dispatch]
  );

  const setValid = useCallback(
    (isValid: boolean) => {
      dispatch(setWizardValid(isValid));
    },
    [dispatch]
  );

  const clearWizardState = useCallback(() => {
    dispatch(clearWizard());
  }, [dispatch]);

  // Validation helpers
  const canGoToStep = useCallback(
    (step: QuotationWizardStep) => {
      // Can always go to previous steps
      if (step <= wizardState.currentStep) {
        return true;
      }

      // Can only go to next step if current step is valid
      if (step === wizardState.currentStep + 1) {
        return wizardState.isValid;
      }

      // Cannot skip steps
      return false;
    },
    [wizardState.currentStep, wizardState.isValid]
  );

  const getStepTitle = useCallback((step: QuotationWizardStep) => {
    return STEP_CONFIG[step]?.title || `Step ${step}`;
  }, []);

  const getStepDescription = useCallback((step: QuotationWizardStep) => {
    return STEP_CONFIG[step]?.description || '';
  }, []);

  return {
    // Current state
    isActive: wizardState.isActive,
    currentStep: wizardState.currentStep,
    data: wizardState.data,
    errors: wizardState.errors,
    isValid: wizardState.isValid,
    isCreating: wizardState.creating,

    // Progress information
    progress,

    // Navigation functions
    startForLead,
    nextStep,
    previousStep,
    goToStep,

    // Data management functions
    updateData,
    setErrors,
    setValid,

    // Wizard lifecycle
    clearWizardState,

    // Validation helpers
    canGoToStep,
    getStepTitle,
    getStepDescription,
  };
};

export default useQuotationWizard;
