/**
 * Status Validation Edge Cases and Error Boundary Tests
 */

import {
  validateStatusChange,
  isTransitionAllowed,
} from '../../src/validation/statusValidation';
import { StatusChangeDraft } from '../../src/types/lead';

describe('StatusValidation Edge Cases', () => {
  describe('Boundary Conditions', () => {
    test('should handle exactly 10 character remarks', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Not Interested',
        remarks: '1234567890', // Exactly 10 characters
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });

    test('should handle exactly 30-day follow-up', () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Valid remarks here for discussion',
        nextFollowUpDate: thirtyDaysFromNow.toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });

    test('should handle follow-up date at start of tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Valid remarks here for discussion',
        nextFollowUpDate: tomorrow.toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('Date Edge Cases', () => {
    test('should fail with follow-up date at end of today', () => {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Valid remarks here for discussion',
        nextFollowUpDate: endOfToday.toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.nextFollowUpDate).toContain(
        'must be in the future'
      );
    });

    test('should fail with follow-up date exactly 31 days', () => {
      const thirtyOneDaysFromNow = new Date();
      thirtyOneDaysFromNow.setDate(thirtyOneDaysFromNow.getDate() + 31);

      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Valid remarks here for discussion',
        nextFollowUpDate: thirtyOneDaysFromNow.toISOString(),
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.nextFollowUpDate).toContain(
        'cannot be more than 30 days'
      );
    });
  });

  describe('Null/Undefined Handling', () => {
    test('should handle undefined optional fields gracefully', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Not Interested',
        remarks: 'Customer not interested in solar installation',
        nextFollowUpDate: undefined,
        quotationRef: undefined,
        tokenNumber: undefined,
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('Format Validation Edge Cases', () => {
    test('should pass with valid quotation ref variations', () => {
      const validRefs = ['QUOT-1', 'QUOT-123', 'QUOT-999999'];

      validRefs.forEach((ref) => {
        const input: StatusChangeDraft = {
          currentStatus: 'Customer Accepted',
          newStatus: 'Won',
          remarks: 'Customer accepted quotation with reference',
          quotationRef: ref,
        };

        const result = validateStatusChange(input);
        expect(result.valid).toBe(true);
      });
    });

    test('should pass with valid token number variations', () => {
      const validTokens = ['TKN-1', 'TKN-123', 'TKN-999999'];

      validTokens.forEach((token) => {
        const input: StatusChangeDraft = {
          currentStatus: 'Pending at Solarium',
          newStatus: 'Under Execution',
          remarks: 'Installation started with token number',
          tokenNumber: token,
        };

        const result = validateStatusChange(input);
        expect(result.valid).toBe(true);
      });
    });

    test('should fail with invalid quotation ref formats', () => {
      const invalidRefs = [
        'QUOT',
        'QUOT-',
        'QUOT-ABC',
        'QUO-123',
        'quot-123',
        'QUOT_123',
      ];

      invalidRefs.forEach((ref) => {
        const input: StatusChangeDraft = {
          currentStatus: 'Customer Accepted',
          newStatus: 'Won',
          remarks: 'Customer accepted quotation with invalid reference',
          quotationRef: ref,
        };

        const result = validateStatusChange(input);
        expect(result.valid).toBe(false);
        expect(result.errors?.quotationRef).toContain(
          'Invalid quotation reference format'
        );
      });
    });

    test('should fail with invalid token number formats', () => {
      const invalidTokens = [
        'TKN',
        'TKN-',
        'TKN-ABC',
        'TK-123',
        'tkn-123',
        'TKN_123',
      ];

      invalidTokens.forEach((token) => {
        const input: StatusChangeDraft = {
          currentStatus: 'Pending at Solarium',
          newStatus: 'Under Execution',
          remarks: 'Installation started with invalid token',
          tokenNumber: token,
        };

        const result = validateStatusChange(input);
        expect(result.valid).toBe(false);
        expect(result.errors?.tokenNumber).toContain(
          'Invalid token number format'
        );
      });
    });
  });

  describe('Complex Business Logic Scenarios', () => {
    test('should validate complete Won workflow', () => {
      // Simulate complete workflow to Won status
      const steps = [
        { from: 'New Lead', to: 'In Discussion' },
        { from: 'In Discussion', to: 'Physical Meeting Assigned' },
        { from: 'Physical Meeting Assigned', to: 'Customer Accepted' },
        { from: 'Customer Accepted', to: 'Won' },
      ];

      steps.forEach((step) => {
        expect(isTransitionAllowed(step.from, step.to)).toBe(true);
      });
    });

    test('should validate complete execution workflow', () => {
      // Simulate complete workflow to Executed status
      const steps = [
        { from: 'Won', to: 'Pending at Solarium' },
        { from: 'Pending at Solarium', to: 'Under Execution' },
        { from: 'Under Execution', to: 'Executed' },
      ];

      steps.forEach((step) => {
        expect(isTransitionAllowed(step.from, step.to)).toBe(true);
      });
    });

    test('should handle same status update for field changes', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Won',
        newStatus: 'Won',
        remarks: 'Updated quotation reference for same status',
        quotationRef: 'QUOT-9999',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('Real-world Error Scenarios', () => {
    test('should handle user trying to skip Physical Meeting', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'In Discussion',
        newStatus: 'Customer Accepted',
        remarks: 'Customer wants to skip meeting but this is not allowed',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toContain('follow the proper sequence');
    });

    test('should handle missing quotation ref for Won status', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Customer Accepted',
        newStatus: 'Won',
        remarks: 'Customer agreed but forgot to provide quotation reference',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.quotationRef).toContain(
        'Quotation reference is required'
      );
    });

    test('should handle attempting to revert from terminal state', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'Not Interested',
        newStatus: 'In Discussion',
        remarks: 'Customer changed mind but this transition is not allowed',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);
      expect(result.errors?.transition).toBeDefined();
    });
  });
});
