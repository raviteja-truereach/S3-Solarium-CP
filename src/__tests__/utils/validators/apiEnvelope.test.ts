/**
 * API Envelope Validator Tests
 */
import {
  isApiEnvelope,
  assertApiEnvelope,
  transformApiEnvelope,
  ApiEnvelope,
} from '../../../utils/validators/apiEnvelope';

describe('API Envelope Validators', () => {
  const validEnvelope: ApiEnvelope = {
    success: true,
    data: {
      items: [{ id: '1', name: 'Test' }],
      total: 50,
      limit: 20,
      offset: 0,
    },
  };

  describe('isApiEnvelope', () => {
    it('should return true for valid envelope', () => {
      expect(isApiEnvelope(validEnvelope)).toBe(true);
    });

    it('should return false for invalid envelopes', () => {
      expect(isApiEnvelope(null)).toBe(false);
      expect(isApiEnvelope({})).toBe(false);
      expect(isApiEnvelope({ success: 'true' })).toBe(false); // wrong type
      expect(isApiEnvelope({ success: true, data: null })).toBe(false);
      expect(
        isApiEnvelope({
          success: true,
          data: { items: 'not-array' },
        })
      ).toBe(false);
    });
  });

  describe('transformApiEnvelope', () => {
    const mockValidator = (item: any): item is { id: string } =>
      typeof item?.id === 'string';

    it('should transform valid envelope correctly', () => {
      const result = transformApiEnvelope(validEnvelope, mockValidator, 'test');

      expect(result).toEqual({
        items: [{ id: '1', name: 'Test' }],
        page: 1,
        totalPages: 3, // Math.ceil(50 / 20)
        total: 50,
        limit: 20,
      });
    });

    it('should calculate pagination correctly', () => {
      const envelope = {
        ...validEnvelope,
        data: {
          ...validEnvelope.data,
          offset: 40, // Page 3
          total: 100,
          limit: 20,
        },
      };

      const result = transformApiEnvelope(envelope, mockValidator);

      expect(result.page).toBe(3); // (40 / 20) + 1
      expect(result.totalPages).toBe(5); // Math.ceil(100 / 20)
    });

    it('should skip invalid items and log warnings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const envelope = {
        ...validEnvelope,
        data: {
          ...validEnvelope.data,
          items: [
            { id: '1' }, // valid
            { name: 'invalid' }, // invalid - no id
            { id: '2' }, // valid
          ],
        },
      };

      const result = transformApiEnvelope(envelope, mockValidator, 'item');

      expect(result.items).toHaveLength(2);
      expect(result.items.map((item) => item.id)).toEqual(['1', '2']);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid item skipped:', {
        name: 'invalid',
      });

      consoleSpy.mockRestore();
    });
  });
});
