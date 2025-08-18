/**
 * Validation Module Exports
 */

export {
  validateStatusChange,
  isTransitionAllowed,
  getStatusRequirements,
  getAllowedNextStatuses,
} from './statusValidation';

export { validateAddLeadForm, isFormValid, validators } from './leadSchema';

export type { StatusChangeDraft, ValidationResult } from '../types/lead';

export type { NewLeadFormData, ValidationError } from './leadSchema';
