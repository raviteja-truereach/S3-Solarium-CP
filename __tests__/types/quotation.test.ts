/**
 * Quotation Types Tests
 * Testing type guards and helper functions
 */
import {
  isValidQuotationStatus,
  isValidQuotationTransition,
  canEditQuotation,
  canShareQuotation,
  isTerminalQuotationStatus,
  getQuotationStatusDisplayText,
  getPanelQuantityRange,
  calculateSystemCapacity,
  isInverterCapacityCompatible,
} from '../../src/types/quotation';
import type { QuotationStatus } from '../../src/types/api/quotation';

describe('Quotation Type Guards', () => {
  describe('isValidQuotationStatus', () => {
    it('should validate correct quotation statuses', () => {
      expect(isValidQuotationStatus('Generated')).toBe(true);
      expect(isValidQuotationStatus('Shared')).toBe(true);
      expect(isValidQuotationStatus('Accepted')).toBe(true);
      expect(isValidQuotationStatus('Rejected')).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(isValidQuotationStatus('Draft')).toBe(false);
      expect(isValidQuotationStatus('Pending')).toBe(false);
      expect(isValidQuotationStatus('Invalid')).toBe(false);
      expect(isValidQuotationStatus('')).toBe(false);
      expect(isValidQuotationStatus('generated')).toBe(false); // Case sensitive
    });
  });

  describe('isValidQuotationTransition', () => {
    it('should allow valid transitions from Generated', () => {
      expect(isValidQuotationTransition('Generated', 'Shared')).toBe(true);
    });

    it('should allow valid transitions from Shared', () => {
      expect(isValidQuotationTransition('Shared', 'Accepted')).toBe(true);
      expect(isValidQuotationTransition('Shared', 'Rejected')).toBe(true);
    });

    it('should reject invalid transitions from Generated', () => {
      expect(isValidQuotationTransition('Generated', 'Accepted')).toBe(false);
      expect(isValidQuotationTransition('Generated', 'Rejected')).toBe(false);
      expect(isValidQuotationTransition('Generated', 'Generated')).toBe(false);
    });

    it('should reject all transitions from terminal states', () => {
      expect(isValidQuotationTransition('Accepted', 'Shared')).toBe(false);
      expect(isValidQuotationTransition('Accepted', 'Rejected')).toBe(false);
      expect(isValidQuotationTransition('Rejected', 'Accepted')).toBe(false);
      expect(isValidQuotationTransition('Rejected', 'Shared')).toBe(false);
    });

    it('should only allow Generated for new quotations', () => {
      expect(isValidQuotationTransition(undefined, 'Generated')).toBe(true);
      expect(isValidQuotationTransition(undefined, 'Shared')).toBe(false);
      expect(isValidQuotationTransition(undefined, 'Accepted')).toBe(false);
      expect(isValidQuotationTransition(undefined, 'Rejected')).toBe(false);
    });
  });

  describe('canEditQuotation', () => {
    it('should allow editing only for Generated status', () => {
      expect(canEditQuotation('Generated')).toBe(true);
      expect(canEditQuotation('Shared')).toBe(false);
      expect(canEditQuotation('Accepted')).toBe(false);
      expect(canEditQuotation('Rejected')).toBe(false);
    });
  });

  describe('canShareQuotation', () => {
    it('should allow sharing only for Generated status', () => {
      expect(canShareQuotation('Generated')).toBe(true);
      expect(canShareQuotation('Shared')).toBe(false);
      expect(canShareQuotation('Accepted')).toBe(false);
      expect(canShareQuotation('Rejected')).toBe(false);
    });
  });

  describe('isTerminalQuotationStatus', () => {
    it('should identify terminal states correctly', () => {
      expect(isTerminalQuotationStatus('Accepted')).toBe(true);
      expect(isTerminalQuotationStatus('Rejected')).toBe(true);
      expect(isTerminalQuotationStatus('Generated')).toBe(false);
      expect(isTerminalQuotationStatus('Shared')).toBe(false);
    });
  });

  describe('getQuotationStatusDisplayText', () => {
    it('should return user-friendly status text', () => {
      expect(getQuotationStatusDisplayText('Generated')).toBe('Generated');
      expect(getQuotationStatusDisplayText('Shared')).toBe(
        'Shared with Customer'
      );
      expect(getQuotationStatusDisplayText('Accepted')).toBe(
        'Accepted by Customer'
      );
      expect(getQuotationStatusDisplayText('Rejected')).toBe(
        'Rejected by Customer'
      );
    });

    it('should return original status for unknown values', () => {
      expect(getQuotationStatusDisplayText('Unknown' as QuotationStatus)).toBe(
        'Unknown'
      );
    });
  });
});

describe('Quotation Helper Functions', () => {
  describe('getPanelQuantityRange', () => {
    it('should return correct range for Single phase', () => {
      const range = getPanelQuantityRange('Single');
      expect(range.min).toBe(4);
      expect(range.max).toBe(9);
    });

    it('should return correct range for Three phase', () => {
      const range = getPanelQuantityRange('Three');
      expect(range.min).toBe(7);
      expect(range.max).toBe(18);
    });
  });

  describe('calculateSystemCapacity', () => {
    it('should calculate system capacity correctly', () => {
      const panels = [
        { wattage: 540, quantity: 10 },
        { wattage: 320, quantity: 5 },
      ];

      const capacity = calculateSystemCapacity(panels);
      expect(capacity).toBe(7); // (540*10 + 320*5) / 1000 = 7kW
    });

    it('should handle single panel type', () => {
      const panels = [{ wattage: 540, quantity: 8 }];

      const capacity = calculateSystemCapacity(panels);
      expect(capacity).toBe(4.32); // 540*8 / 1000 = 4.32kW
    });

    it('should handle empty panel array', () => {
      const capacity = calculateSystemCapacity([]);
      expect(capacity).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const panels = [
        { wattage: 333, quantity: 10 }, // 3.33kW
      ];

      const capacity = calculateSystemCapacity(panels);
      expect(capacity).toBe(3.33);
    });

    it('should handle zero wattage gracefully', () => {
      const panels = [
        { wattage: 0, quantity: 10 },
        { wattage: 540, quantity: 5 },
      ];

      const capacity = calculateSystemCapacity(panels);
      expect(capacity).toBe(2.7); // 540*5 / 1000 = 2.7kW
    });
  });

  describe('isInverterCapacityCompatible', () => {
    it('should return true for compatible capacities within default tolerance', () => {
      expect(isInverterCapacityCompatible(5, 5)).toBe(true); // Exact match
      expect(isInverterCapacityCompatible(5, 4.5)).toBe(true); // 10% lower
      expect(isInverterCapacityCompatible(5, 5.5)).toBe(true); // 10% higher
    });

    it('should return false for capacities outside default tolerance', () => {
      expect(isInverterCapacityCompatible(5, 4.0)).toBe(false); // 20% lower
      expect(isInverterCapacityCompatible(5, 6.0)).toBe(false); // 20% higher
    });

    it('should respect custom tolerance', () => {
      expect(isInverterCapacityCompatible(5, 4.0, 0.25)).toBe(true); // 25% tolerance
      expect(isInverterCapacityCompatible(5, 6.5, 0.25)).toBe(true); // 25% tolerance
      expect(isInverterCapacityCompatible(5, 3.5, 0.25)).toBe(false); // Outside 25%
    });

    it('should handle edge cases', () => {
      expect(isInverterCapacityCompatible(0, 0)).toBe(true); // Zero capacity
      expect(isInverterCapacityCompatible(1, 0.85)).toBe(true); // Minimum edge
      expect(isInverterCapacityCompatible(1, 1.15)).toBe(true); // Maximum edge
    });

    it('should handle boundary conditions precisely', () => {
      // Test exact boundaries for 15% tolerance
      expect(isInverterCapacityCompatible(10, 8.5)).toBe(true); // Exactly 15% lower
      expect(isInverterCapacityCompatible(10, 11.5)).toBe(true); // Exactly 15% higher
      expect(isInverterCapacityCompatible(10, 8.49)).toBe(false); // Just outside lower bound
      expect(isInverterCapacityCompatible(10, 11.51)).toBe(false); // Just outside upper bound
    });
  });
});

describe('Type Safety', () => {
  it('should maintain type safety for QuotationStatus', () => {
    const status: QuotationStatus = 'Generated';
    expect(isValidQuotationStatus(status)).toBe(true);

    const validStatuses: QuotationStatus[] = [
      'Generated',
      'Shared',
      'Accepted',
      'Rejected',
    ];
    validStatuses.forEach((s) => {
      expect(isValidQuotationStatus(s)).toBe(true);
    });
  });

  it('should handle type narrowing correctly', () => {
    const unknownStatus: string = 'Generated';

    if (isValidQuotationStatus(unknownStatus)) {
      // TypeScript should narrow the type here
      const narrowedStatus: QuotationStatus = unknownStatus;
      expect(canEditQuotation(narrowedStatus)).toBe(true);
    }
  });
});
