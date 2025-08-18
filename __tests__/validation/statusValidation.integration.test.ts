/**
 * Status Validation Integration Tests
 * Tests integration with existing validation system
 */

import { validateStatusChange } from '../../src/validation/statusValidation';
import { validators } from '../../src/validation/leadSchema';
import { StatusChangeDraft } from '../../src/types/lead';

describe('Status Validation Integration', () => {
  describe('Integration with existing validators', () => {
    test('should use existing remarks validator', () => {
      // Test that our status validation uses the same remarks validation
      const shortRemarks = 'Short';

      // Test existing validator directly
      const existingValidatorResult = validators.remarks(shortRemarks);
      expect(existingValidatorResult).toContain('at least 10 characters');

      // Test through status validation
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Not Interested',
        remarks: shortRemarks,
      };

      const statusValidationResult = validateStatusChange(input);
      expect(statusValidationResult.valid).toBe(false);
      expect(statusValidationResult.errors?.remarks).toContain(
        'at least 10 characters'
      );
    });

    test('should handle optional remarks correctly', () => {
      // Test existing validator with undefined
      const existingValidatorResult = validators.remarks(undefined);
      expect(existingValidatorResult).toBeNull();

      // But status validation should require remarks
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Not Interested',
        remarks: '',
      };

      const statusValidationResult = validateStatusChange(input);
      expect(statusValidationResult.valid).toBe(false);
      expect(statusValidationResult.errors?.remarks).toBeDefined();
    });
  });

  describe('Consistency with lead statuses', () => {
    test('should work with all defined lead statuses', () => {
      const { LEAD_STATUSES } = require('../../src/constants/leadStatus');

      // Ensure all defined statuses are handled
      LEAD_STATUSES.forEach((status: string) => {
        const input: StatusChangeDraft = {
          currentStatus: status,
          newStatus: status, // Same status should always be valid
          remarks: 'Valid remarks for status consistency check',
        };

        const result = validateStatusChange(input);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Error message consistency', () => {
    test('should provide user-friendly error messages', () => {
      const input: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'Won',
        remarks: 'Bad',
      };

      const result = validateStatusChange(input);
      expect(result.valid).toBe(false);

      // Check that all error messages are user-friendly
      Object.values(result.errors || {}).forEach((error) => {
        expect(error).toMatch(/^[A-Z]/); // Should start with capital letter
        expect(error.length).toBeGreaterThan(10); // Should be descriptive
        expect(error).not.toMatch(/undefined|null|error/i); // Should not contain technical terms
      });
    });
  });
});
