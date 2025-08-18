/**
 * Comprehensive StatusValidationService Unit Tests
 * Achieving ≥85% coverage with edge cases
 */

import {
  validateStatusChange,
  isTransitionAllowed,
  getStatusRequirements,
  getAllowedNextStatuses,
} from '../../src/validation/statusValidation';
import { StatusChangeDraft } from '../../src/types/lead';
import { LeadStatus } from '../../src/constants/leadStatus';

describe('StatusValidationService - Comprehensive Coverage', () => {
  describe('Core Validation Logic', () => {
    test('should validate complete status change workflow', () => {
      const validWorkflow: StatusChangeDraft[] = [
        {
          currentStatus: 'New Lead',
          newStatus: 'In Discussion',
          remarks: 'Initial customer contact made successfully',
          nextFollowUpDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          currentStatus: 'In Discussion',
          newStatus: 'Physical Meeting Assigned',
          remarks: 'Meeting scheduled for next week',
          nextFollowUpDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          currentStatus: 'Physical Meeting Assigned',
          newStatus: 'Customer Accepted',
          remarks: 'Customer agreed to proceed with installation',
          nextFollowUpDate: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          currentStatus: 'Customer Accepted',
          newStatus: 'Won',
          remarks: 'Contract signed and quotation accepted',
          quotationRef: 'QUOT-12345',
        },
        {
          currentStatus: 'Won',
          newStatus: 'Under Execution',
          remarks: 'Installation work has commenced',
          tokenNumber: 'TKN-67890',
        },
        {
          currentStatus: 'Under Execution',
          newStatus: 'Executed',
          remarks: 'Installation completed and system commissioned',
          tokenNumber: 'TKN-67890',
        },
      ];

      validWorkflow.forEach((step, index) => {
        const result = validateStatusChange(step);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
        console.log(
          `✅ Step ${index + 1}: ${step.currentStatus} → ${step.newStatus}`
        );
      });
    });

    test('should handle all terminal status transitions', () => {
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
          const draft: StatusChangeDraft = {
            currentStatus: activeStatus,
            newStatus: terminalStatus,
            remarks: `Customer marked as ${terminalStatus.toLowerCase()}`,
          };

          const result = validateStatusChange(draft);
          expect(result.valid).toBe(true);
        });
      });
    });
  });

  describe('Validation Edge Cases', () => {
    test('should handle empty/null input gracefully', () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { currentStatus: '', newStatus: '', remarks: '' },
        { currentStatus: null, newStatus: null, remarks: null },
      ];

      invalidInputs.forEach((input, index) => {
        const result = validateStatusChange(input as any);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        console.log(
          `❌ Invalid input ${index + 1}:`,
          Object.keys(result.errors || {})
        );
      });
    });

    test('should validate remarks length boundaries', () => {
      const testCases = [
        { remarks: '', shouldPass: false, description: 'empty remarks' },
        {
          remarks: '123456789',
          shouldPass: false,
          description: '9 characters',
        },
        {
          remarks: '1234567890',
          shouldPass: true,
          description: 'exactly 10 characters',
        },
        {
          remarks: '12345678901',
          shouldPass: true,
          description: '11 characters',
        },
        {
          remarks: 'A'.repeat(1000),
          shouldPass: true,
          description: '1000 characters',
        },
      ];

      testCases.forEach(({ remarks, shouldPass, description }) => {
        const draft: StatusChangeDraft = {
          currentStatus: 'New Lead',
          newStatus: 'Not Interested',
          remarks,
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(shouldPass);

        if (!shouldPass) {
          expect(result.errors?.remarks).toBeDefined();
        }

        console.log(
          `${shouldPass ? '✅' : '❌'} ${description}: ${remarks.length} chars`
        );
      });
    });

    test('should validate follow-up date boundaries', () => {
      const now = new Date();
      const testCases = [
        {
          date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
          shouldPass: false,
          description: 'past date',
        },
        {
          date: new Date(now.getTime() + 60 * 1000), // 1 minute from now
          shouldPass: true,
          description: '1 minute future',
        },
        {
          date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          shouldPass: true,
          description: 'exactly 30 days',
        },
        {
          date: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000), // 31 days
          shouldPass: false,
          description: '31 days (too far)',
        },
      ];

      testCases.forEach(({ date, shouldPass, description }) => {
        const draft: StatusChangeDraft = {
          currentStatus: 'New Lead',
          newStatus: 'In Discussion',
          remarks: 'Testing follow-up date validation',
          nextFollowUpDate: date.toISOString(),
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(shouldPass);

        if (!shouldPass) {
          expect(result.errors?.nextFollowUpDate).toBeDefined();
        }

        console.log(`${shouldPass ? '✅' : '❌'} ${description}`);
      });
    });

    test('should validate field format patterns', () => {
      const quotationTestCases = [
        { ref: 'QUOT-123', valid: true },
        { ref: 'QUOT-999999', valid: true },
        { ref: 'QUOT-', valid: false },
        { ref: 'QUOT123', valid: false },
        { ref: 'QUO-123', valid: false },
        { ref: 'quot-123', valid: false },
        { ref: '', valid: false },
      ];

      quotationTestCases.forEach(({ ref, valid }) => {
        const draft: StatusChangeDraft = {
          currentStatus: 'Customer Accepted',
          newStatus: 'Won',
          remarks: 'Testing quotation reference format',
          quotationRef: ref,
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(valid);

        if (!valid && ref !== '') {
          expect(result.errors?.quotationRef).toContain(
            'Invalid quotation reference format'
          );
        }
      });

      const tokenTestCases = [
        { token: 'TKN-123', valid: true },
        { token: 'TKN-999999', valid: true },
        { token: 'TKN-', valid: false },
        { token: 'TKN123', valid: false },
        { token: 'TK-123', valid: false },
        { token: 'tkn-123', valid: false },
        { token: '', valid: false },
      ];

      tokenTestCases.forEach(({ token, valid }) => {
        const draft: StatusChangeDraft = {
          currentStatus: 'Won',
          newStatus: 'Under Execution',
          remarks: 'Testing token number format',
          tokenNumber: token,
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(valid);

        if (!valid && token !== '') {
          expect(result.errors?.tokenNumber).toContain(
            'Invalid token number format'
          );
        }
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should prevent skip-ahead transitions', () => {
      const invalidTransitions = [
        { from: 'New Lead', to: 'Physical Meeting Assigned' },
        { from: 'New Lead', to: 'Customer Accepted' },
        { from: 'New Lead', to: 'Won' },
        { from: 'In Discussion', to: 'Customer Accepted' },
        { from: 'In Discussion', to: 'Won' },
        { from: 'Physical Meeting Assigned', to: 'Won' },
      ];

      invalidTransitions.forEach(({ from, to }) => {
        const draft: StatusChangeDraft = {
          currentStatus: from,
          newStatus: to,
          remarks: `Invalid transition test: ${from} to ${to}`,
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(false);
        expect(result.errors?.transition).toContain(
          'Cannot change status from'
        );
        expect(result.errors?.transition).toContain(
          'follow the proper sequence'
        );
      });
    });

    test('should prevent backward transitions', () => {
      const backwardTransitions = [
        { from: 'Won', to: 'Customer Accepted' },
        { from: 'Under Execution', to: 'Won' },
        { from: 'Executed', to: 'Under Execution' },
        { from: 'Customer Accepted', to: 'Physical Meeting Assigned' },
      ];

      backwardTransitions.forEach(({ from, to }) => {
        const draft: StatusChangeDraft = {
          currentStatus: from,
          newStatus: to,
          remarks: `Backward transition test: ${from} to ${to}`,
        };

        const result = validateStatusChange(draft);
        expect(result.valid).toBe(false);
        expect(result.errors?.transition).toBeDefined();
      });
    });
  });

  describe('Helper Functions Coverage', () => {
    test('should return correct status requirements', () => {
      const requirementTests = [
        {
          status: 'In Discussion',
          expectedRequirements: [
            'Follow-up date required',
            'Remarks must be at least 10 characters',
          ],
        },
        {
          status: 'Won',
          expectedRequirements: [
            'Quotation reference required',
            'Remarks must be at least 10 characters',
          ],
        },
        {
          status: 'Under Execution',
          expectedRequirements: [
            'Token number required',
            'Remarks must be at least 10 characters',
          ],
        },
        {
          status: 'Not Interested',
          expectedRequirements: ['Remarks must be at least 10 characters'],
        },
      ];

      requirementTests.forEach(({ status, expectedRequirements }) => {
        const requirements = getStatusRequirements(status);

        expectedRequirements.forEach((expected) => {
          expect(
            requirements.some((req) => req.includes(expected.split(' ')[0]))
          ).toBe(true);
        });
      });
    });

    test('should return correct allowed next statuses', () => {
      const allowedStatusTests = [
        {
          current: 'New Lead',
          expected: [
            'In Discussion',
            'Not Responding',
            'Not Interested',
            'Other Territory',
          ],
        },
        {
          current: 'Won',
          expected: [
            'Pending at Solarium',
            'Not Responding',
            'Not Interested',
            'Other Territory',
          ],
        },
        {
          current: 'Executed',
          expected: [],
        },
        {
          current: 'Unknown Status',
          expected: [],
        },
      ];

      allowedStatusTests.forEach(({ current, expected }) => {
        const allowed = getAllowedNextStatuses(current);
        expect(allowed).toEqual(expected);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should validate status changes quickly', () => {
      const draft: StatusChangeDraft = {
        currentStatus: 'New Lead',
        newStatus: 'In Discussion',
        remarks: 'Performance test with adequate length remarks for validation',
        nextFollowUpDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateStatusChange(draft);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(1); // Should validate in less than 1ms on average
      console.log(`⚡ Average validation time: ${avgTime.toFixed(3)}ms`);
    });
  });
});
