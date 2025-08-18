/**
 * Status Validation Service Tests
 * Comprehensive test suite with 100% branch coverage
 */

import {
  validateStatusChange,
  isTransitionAllowed,
  getStatusRequirements,
  getAllowedNextStatuses,
} from '../../src/validation/statusValidation';
import { StatusChangeDraft } from '../../src/types/lead';

describe('StatusValidationService', () => {
  describe('isTransitionAllowed', () => {
    test('should allow valid sequential transitions', () => {
      expect(isTransitionAllowed('New Lead', 'In Discussion')).toBe(true);
      expect(
        isTransitionAllowed('In Discussion', 'Physical Meeting Assigned')
      ).toBe(true);
      expect(
        isTransitionAllowed('Physical Meeting Assigned', 'Customer Accepted')
      ).toBe(true);
      expect(isTransitionAllowed('Customer Accepted', 'Won')).toBe(true);
      expect(isTransitionAllowed('Won', 'Pending at Solarium')).toBe(true);
      expect(
        isTransitionAllowed('Pending at Solarium', 'Under Execution')
      ).toBe(true);
      expect(isTransitionAllowed('Under Execution', 'Executed')).toBe(true);
    });

    test('should allow transitions to terminal states from any active status', () => {
      const activeStatuses = [
        'New Lead',
        'In Discussion',
        'Physical Meeting Assigned',
        'Customer Accepted',
      ];
      const terminalStatuses = [
        'Not Responding',
        'Not Interested',
        'Other Territory',
      ];

      activeStatuses.forEach((activeStatus) => {
        terminalStatuses.forEach((terminalStatus) => {
          expect(isTransitionAllowed(activeStatus, terminalStatus)).toBe(true);
        });
      });
    });

    test('should reject invalid sequential transitions', () => {
      expect(isTransitionAllowed('New Lead', 'Physical Meeting Assigned')).toBe(
        false
      );
      expect(isTransitionAllowed('New Lead', 'Won')).toBe(false);
      expect(isTransitionAllowed('In Discussion', 'Customer Accepted')).toBe(
        false
      );
      expect(isTransitionAllowed('Physical Meeting Assigned', 'Won')).toBe(
        false
      );
    });

    test('should reject transitions from terminal states', () => {
      const terminalStatuses = [
        'Executed',
        'Not Responding',
        'Not Interested',
        'Other Territory',
      ];
      const anyStatus = 'New Lead';

      terminalStatuses.forEach((terminalStatus) => {
        expect(isTransitionAllowed(terminalStatus, anyStatus)).toBe(false);
      });
    });

    test('should allow same status transitions', () => {
      expect(isTransitionAllowed('New Lead', 'New Lead')).toBe(true);
      expect(isTransitionAllowed('Won', 'Won')).toBe(true);
      expect(isTransitionAllowed('Executed', 'Executed')).toBe(true);
    });

    test('should handle unknown status', () => {
      expect(isTransitionAllowed('Unknown Status', 'New Lead')).toBe(false);
    });
  });

  describe('validateStatusChange - Valid Cases', () => {
    test('should pass valid basic status change', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Initial discussion scheduled with customer',
        nextFollowUpDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should pass valid Won status with quotation ref', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Customer Accepted',
        newStatus: 'Won',
        remarks: 'Customer accepted the quotation and signed contract',
        quotationRef: 'QUOT-1013',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should pass valid Under Execution with token number', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Pending at Solarium',
        newStatus: 'Under Execution',
        remarks: 'Installation work has started at customer site',
        tokenNumber: 'TKN-5001',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should pass valid Executed status with token number', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Under Execution',
        newStatus: 'Executed',
        remarks: 'Installation completed successfully and commissioned',
        tokenNumber: 'TKN-5001',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should pass valid terminal status transition', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'In Discussion',
        newStatus: 'Not Interested',
        remarks: 'Customer decided not to proceed with solar installation',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('validateStatusChange - Remarks Validation', () => {
    test('should fail when remarks too short', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Short',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.remarks).toContain('at least 10 characters');
    });

    test('should fail when remarks empty', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: '',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.remarks).toBeDefined();
    });

    test('should pass when remarks exactly 10 characters', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Not Interested',
        remarks: '1234567890', // Exactly 10 characters
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatusChange - Follow-up Date Validation', () => {
    test('should fail when follow-up date in past', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Customer discussion scheduled',
        nextFollowUpDate: new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.nextFollowUpDate).toContain(
        'must be in the future'
      );
    });

    test('should fail when follow-up date too far', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Customer discussion scheduled',
        nextFollowUpDate: new Date(
          Date.now() + 35 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.nextFollowUpDate).toContain(
        'cannot be more than 30 days'
      );
    });

    test('should pass when follow-up date exactly 30 days', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Customer discussion scheduled',
        nextFollowUpDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });

    test('should fail when follow-up required but missing', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Customer discussion completed',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.nextFollowUpDate).toContain(
        'Follow-up date is required'
      );
    });

    test('should pass for statuses not requiring follow-up', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'In Discussion',
        newStatus: 'Not Interested',
        remarks: 'Customer not interested in solar installation',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatusChange - Required Fields', () => {
    test('should fail Won status without quotation ref', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Customer Accepted',
        newStatus: 'Won',
        remarks: 'Customer accepted quotation',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.quotationRef).toContain(
        'Quotation reference is required'
      );
    });

    test('should fail Under Execution without token number', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Pending at Solarium',
        newStatus: 'Under Execution',
        remarks: 'Installation process initiated',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.tokenNumber).toContain('Token number is required');
    });

    test('should fail Executed without token number', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Under Execution',
        newStatus: 'Executed',
        remarks: 'Installation completed successfully',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.tokenNumber).toContain('Token number is required');
    });

    test('should fail with invalid quotation ref format', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Customer Accepted',
        newStatus: 'Won',
        remarks: 'Customer accepted the quotation',
        quotationRef: 'INVALID-FORMAT',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.quotationRef).toContain(
        'Invalid quotation reference format'
      );
    });

    test('should fail with invalid token number format', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Pending at Solarium',
        newStatus: 'Under Execution',
        remarks: 'Installation started',
        tokenNumber: 'INVALID-FORMAT',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.tokenNumber).toContain(
        'Invalid token number format'
      );
    });

    test('should pass Pending at Solarium with quotation ref', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Won',
        newStatus: 'Pending at Solarium',
        remarks: 'Pending internal processing at Solarium',
        quotationRef: 'QUOT-1234',
        nextFollowUpDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStatusChange - Transition Validation', () => {
    test('should fail invalid sequential transitions', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Won',
        remarks: 'Direct jump not allowed in business process',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toContain('Cannot change status from');
      expect(result.errors?.transition).toContain('follow the proper sequence');
    });

    test('should fail transitions from terminal states', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Executed',
        newStatus: 'Under Execution',
        remarks: 'Cannot go back from executed state',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toBeDefined();
    });

    test('should fail transitions from Not Interested', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Not Interested',
        newStatus: 'In Discussion',
        remarks: 'Cannot revive not interested lead',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toBeDefined();
    });
  });

  describe('validateStatusChange - Multiple Errors', () => {
    test('should return multiple validation errors', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Won', // Invalid transition
        remarks: 'Short', // Too short
        nextFollowUpDate: new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString(), // Past date
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors || {})).toHaveLength(3);
      expect(result.errors?.transition).toBeDefined();
      expect(result.errors?.remarks).toBeDefined();
      expect(result.errors?.nextFollowUpDate).toBeDefined();
    });

    test('should return all required field errors for Won status', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Won',
        remarks: 'Bad',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toBeDefined();
      expect(result.errors?.remarks).toBeDefined();
      expect(result.errors?.quotationRef).toBeDefined();
    });
  });

  describe('validateStatusChange - Whitespace Handling', () => {
    test('should fail with whitespace-only quotation ref', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Customer Accepted',
        newStatus: 'Won',
        remarks: 'Customer accepted quotation',
        quotationRef: '   ',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.quotationRef).toContain('required');
    });

    test('should fail with whitespace-only token number', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Pending at Solarium',
        newStatus: 'Under Execution',
        remarks: 'Installation started',
        tokenNumber: '   ',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.tokenNumber).toContain('required');
    });
  });

  describe('getStatusRequirements', () => {
    test('should return requirements for status requiring follow-up', () => {
      const requirements = getStatusRequirements('In Discussion');
      expect(requirements).toContain(
        'Follow-up date required (within 30 days)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });

    test('should return requirements for Physical Meeting Assigned', () => {
      const requirements = getStatusRequirements('Physical Meeting Assigned');
      expect(requirements).toContain(
        'Follow-up date required (within 30 days)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });

    test('should return requirements for Won status', () => {
      const requirements = getStatusRequirements('Won');
      expect(requirements).toContain(
        'Quotation reference required (format: QUOT-XXXX)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });

    test('should return requirements for Under Execution status', () => {
      const requirements = getStatusRequirements('Under Execution');
      expect(requirements).toContain(
        'Token number required (format: TKN-XXXX)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });

    test('should return requirements for Executed status', () => {
      const requirements = getStatusRequirements('Executed');
      expect(requirements).toContain(
        'Token number required (format: TKN-XXXX)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });

    test('should return basic requirements for terminal status', () => {
      const requirements = getStatusRequirements('Not Interested');
      expect(requirements).toEqual(['Remarks must be at least 10 characters']);
    });

    test('should return requirements for Pending at Solarium', () => {
      const requirements = getStatusRequirements('Pending at Solarium');
      expect(requirements).toContain(
        'Follow-up date required (within 30 days)'
      );
      expect(requirements).toContain(
        'Quotation reference required (format: QUOT-XXXX)'
      );
      expect(requirements).toContain('Remarks must be at least 10 characters');
    });
  });

  describe('getAllowedNextStatuses', () => {
    test('should return correct next statuses for New Lead', () => {
      const allowed = getAllowedNextStatuses('New Lead');
      expect(allowed).toEqual([
        'In Discussion',
        'Not Responding',
        'Not Interested',
        'Other Territory',
      ]);
    });

    test('should return correct next statuses for In Discussion', () => {
      const allowed = getAllowedNextStatuses('In Discussion');
      expect(allowed).toEqual([
        'Physical Meeting Assigned',
        'Not Responding',
        'Not Interested',
        'Other Territory',
      ]);
    });

    test('should return correct next statuses for Won', () => {
      const allowed = getAllowedNextStatuses('Won');
      expect(allowed).toEqual([
        'Pending at Solarium',
        'Not Responding',
        'Not Interested',
        'Other Territory',
      ]);
    });

    test('should return empty array for terminal states', () => {
      expect(getAllowedNextStatuses('Executed')).toEqual([]);
      expect(getAllowedNextStatuses('Not Responding')).toEqual([]);
      expect(getAllowedNextStatuses('Not Interested')).toEqual([]);
      expect(getAllowedNextStatuses('Other Territory')).toEqual([]);
    });

    test('should handle unknown status', () => {
      const allowed = getAllowedNextStatuses('Unknown Status');
      expect(allowed).toEqual([]);
    });
  });
});
