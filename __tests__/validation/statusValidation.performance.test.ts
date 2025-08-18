/**
 * Status Validation Performance Tests
 */

import {
  validateStatusChange,
  isTransitionAllowed,
} from '../../src/validation/statusValidation';
import { StatusChangeDraft } from '../../src/types/lead';

describe('Status Validation Performance', () => {
  test('should validate status change quickly', () => {
    const input: StatusChangeDraft = {
      currentStatus: 'New Lead',
      newStatus: 'In Discussion',
      remarks: 'Performance test for status validation with adequate remarks',
      nextFollowUpDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    const startTime = performance.now();

    // Run validation 1000 times
    for (let i = 0; i < 1000; i++) {
      validateStatusChange(input);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete 1000 validations in less than 100ms
    expect(totalTime).toBeLessThan(100);
  });

  test('should check transitions quickly', () => {
    const startTime = performance.now();

    // Run transition checks 10000 times
    for (let i = 0; i < 10000; i++) {
      isTransitionAllowed('New Lead', 'In Discussion');
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete 10000 checks in less than 50ms
    expect(totalTime).toBeLessThan(50);
  });
});
