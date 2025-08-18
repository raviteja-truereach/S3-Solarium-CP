/**
 * Status Validation Service (D-ART-014)
 * Validates lead status changes according to business rules
 */

import {
  STATUS_TRANSITIONS,
  STATUS_FIELD_REQUIREMENTS,
  FOLLOW_UP_REQUIRED_STATUSES,
  MAX_FOLLOW_UP_DAYS,
  MIN_REMARKS_LENGTH,
  type LeadStatus,
} from '../constants/leadStatus';
import { StatusChangeDraft, ValidationResult } from '../types/lead';
import { validators } from './leadSchema';

/**
 * Validates if a status transition is allowed
 * @param currentStatus - Current lead status
 * @param newStatus - Proposed new status
 * @returns boolean indicating if transition is valid
 */
export function isTransitionAllowed(
  currentStatus: string,
  newStatus: string
): boolean {
  // Same status is always allowed (for updating other fields)
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus as LeadStatus];
  if (!allowedTransitions) {
    return false; // Unknown current status
  }

  return allowedTransitions.includes(newStatus as LeadStatus);
}

/**
 * Validates follow-up date constraints
 * @param nextFollowUpDate - ISO date string
 * @returns validation error or null
 */
function validateNextFollowUpDate(nextFollowUpDate: string): string | null {
  const followUp = new Date(nextFollowUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_FOLLOW_UP_DAYS);

  if (followUp <= today) {
    return 'Follow-up date must be in the future';
  }

  if (followUp > maxDate) {
    return `Follow-up date cannot be more than ${MAX_FOLLOW_UP_DAYS} days from today`;
  }

  return null;
}

/**
 * Validates required fields for specific statuses
 * @param newStatus - New status being set
 * @param draft - Status change draft
 * @returns Record of field validation errors
 */
function validateRequiredFields(
  newStatus: string,
  draft: StatusChangeDraft
): Record<string, string> {
  const errors: Record<string, string> = {};
  const requiredFields =
    STATUS_FIELD_REQUIREMENTS[newStatus as LeadStatus] || [];

  for (const field of requiredFields) {
    switch (field) {
      case 'quotationRef':
        if (!draft.quotationRef || draft.quotationRef.trim().length === 0) {
          errors.quotationRef =
            'Quotation reference is required for this status';
        } else if (!/^QUOT-\d+$/.test(draft.quotationRef)) {
          errors.quotationRef =
            'Invalid quotation reference format (expected: QUOT-XXXX)';
        }
        break;
      case 'tokenNumber':
        if (!draft.tokenNumber || draft.tokenNumber.trim().length === 0) {
          errors.tokenNumber = 'Token number is required for this status';
        } else if (!/^TKN-\d+$/.test(draft.tokenNumber)) {
          errors.tokenNumber =
            'Invalid token number format (expected: TKN-XXXX)';
        }
        break;
    }
  }

  return errors;
}

/**
 * Validates follow-up date requirements for specific statuses
 * @param newStatus - New status being set
 * @param nextFollowUpDate - Follow-up date if provided
 * @returns validation error or null
 */
function validateFollowUpRequired(
  newStatus: string,
  nextFollowUpDate?: string
): string | null {
  if (FOLLOW_UP_REQUIRED_STATUSES.includes(newStatus as LeadStatus)) {
    if (!nextFollowUpDate) {
      return 'Follow-up date is required for this status';
    }
  }
  return null;
}

/**
 * Main validation function for status changes
 * @param input - Status change draft to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateStatusChange(
  input: StatusChangeDraft
): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Basic field validation using existing validators
  const remarksError = validators.remarks(input.remarks);
  if (remarksError) {
    errors.remarks = remarksError;
  }

  // 2. Transition validation
  if (!isTransitionAllowed(input.currentStatus, input.newStatus)) {
    errors.transition = `Cannot change status from "${input.currentStatus}" to "${input.newStatus}". Please follow the proper sequence.`;
  }

  // 3. Follow-up date validation
  if (input.nextFollowUpDate) {
    const followUpError = validateNextFollowUpDate(input.nextFollowUpDate);
    if (followUpError) {
      errors.nextFollowUpDate = followUpError;
    }
  }

  // 4. Follow-up date requirement validation
  const followUpRequiredError = validateFollowUpRequired(
    input.newStatus,
    input.nextFollowUpDate
  );
  if (followUpRequiredError) {
    errors.nextFollowUpDate = followUpRequiredError;
  }

  // 5. Required fields validation
  const requiredFieldErrors = validateRequiredFields(input.newStatus, input);
  Object.assign(errors, requiredFieldErrors);

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Helper function to get validation requirements for UI
 * @param status - Status to get requirements for
 * @returns Array of requirement messages
 */
export function getStatusRequirements(status: string): string[] {
  const requirements: string[] = [];

  if (FOLLOW_UP_REQUIRED_STATUSES.includes(status as LeadStatus)) {
    requirements.push(
      `Follow-up date required (within ${MAX_FOLLOW_UP_DAYS} days)`
    );
  }

  const requiredFields = STATUS_FIELD_REQUIREMENTS[status as LeadStatus] || [];
  if (requiredFields.includes('quotationRef')) {
    requirements.push('Quotation reference required (format: QUOT-XXXX)');
  }
  if (requiredFields.includes('tokenNumber')) {
    requirements.push('Token number required (format: TKN-XXXX)');
  }

  requirements.push(
    `Remarks must be at least ${MIN_REMARKS_LENGTH} characters`
  );

  return requirements;
}

/**
 * Helper to get next allowed statuses
 * @param currentStatus - Current status
 * @returns Array of allowed next statuses
 */
export function getAllowedNextStatuses(currentStatus: string): LeadStatus[] {
  return STATUS_TRANSITIONS[currentStatus as LeadStatus] || [];
}
