/**
 * Add Lead Schema Validation Tests
 */
import {
  addLeadSchema,
  NewLeadFormData,
  validationMessages,
} from '../../src/validation/leadSchema';

describe('addLeadSchema', () => {
  describe('Valid inputs', () => {
    it('should validate a complete lead form', () => {
      const validData: NewLeadFormData = {
        customerName: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
        address: '123 Main Street, City',
        state: 'Karnataka',
        pinCode: '560001',
        services: ['Solar Panel Installation'],
        remarks: 'Customer interested in rooftop solar',
      };

      const result = addLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate minimal required fields only', () => {
      const minimalData = {
        customerName: 'Jane Smith',
        phone: '9123456789',
        address: '456 Oak Avenue',
        state: 'Maharashtra',
        pinCode: '400001',
      };

      const result = addLeadSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.services).toEqual([]);
        expect(result.data.email).toBeUndefined();
        expect(result.data.remarks).toBeUndefined();
      }
    });

    it('should trim whitespace from name and address', () => {
      const dataWithWhitespace = {
        customerName: '  John Doe  ',
        phone: '9876543210',
        address: '  123 Main Street  ',
        state: 'Karnataka',
        pinCode: '560001',
      };

      const result = addLeadSchema.safeParse(dataWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerName).toBe('John Doe');
        expect(result.data.address).toBe('123 Main Street');
      }
    });
  });

  describe('Invalid inputs', () => {
    it('should fail validation for missing required fields', () => {
      const incompleteData = {
        customerName: 'John Doe',
        // Missing phone, address, state, pinCode
      };

      const result = addLeadSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message);
        expect(errorMessages).toContain('Phone number is required');
        expect(errorMessages).toContain('Address is required');
        expect(errorMessages).toContain('Please select a state');
        expect(errorMessages).toContain('PIN code is required');
      }
    });

    it('should fail for invalid phone number', () => {
      const testCases = [
        {
          phone: '123',
          expected: 'Please enter a valid 10-digit phone number',
        },
        {
          phone: '12345678901',
          expected: 'Please enter a valid 10-digit phone number',
        },
        {
          phone: 'abcd123456',
          expected: 'Please enter a valid 10-digit phone number',
        },
        {
          phone: '98765-43210',
          expected: 'Please enter a valid 10-digit phone number',
        },
      ];

      testCases.forEach(({ phone, expected }) => {
        const data = {
          customerName: 'John Doe',
          phone,
          address: '123 Main Street',
          state: 'Karnataka',
          pinCode: '560001',
        };

        const result = addLeadSchema.safeParse(data);
        expect(result.success).toBe(false);

        if (!result.success) {
          const phoneError = result.error.issues.find(
            (issue) => issue.path[0] === 'phone'
          );
          expect(phoneError?.message).toBe(expected);
        }
      });
    });

    it('should fail for invalid PIN code', () => {
      const testCases = [
        { pinCode: '123', expected: 'Please enter a valid 6-digit PIN code' },
        {
          pinCode: '1234567',
          expected: 'Please enter a valid 6-digit PIN code',
        },
        {
          pinCode: 'abc123',
          expected: 'Please enter a valid 6-digit PIN code',
        },
        {
          pinCode: '560-001',
          expected: 'Please enter a valid 6-digit PIN code',
        },
      ];

      testCases.forEach(({ pinCode, expected }) => {
        const data = {
          customerName: 'John Doe',
          phone: '9876543210',
          address: '123 Main Street',
          state: 'Karnataka',
          pinCode,
        };

        const result = addLeadSchema.safeParse(data);
        expect(result.success).toBe(false);

        if (!result.success) {
          const pinError = result.error.issues.find(
            (issue) => issue.path[0] === 'pinCode'
          );
          expect(pinError?.message).toBe(expected);
        }
      });
    });

    it('should fail for invalid email format', () => {
      const testCases = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user@domain',
        'user name@domain.com',
      ];

      testCases.forEach((email) => {
        const data = {
          customerName: 'John Doe',
          phone: '9876543210',
          email,
          address: '123 Main Street',
          state: 'Karnataka',
          pinCode: '560001',
        };

        const result = addLeadSchema.safeParse(data);
        expect(result.success).toBe(false);

        if (!result.success) {
          const emailError = result.error.issues.find(
            (issue) => issue.path[0] === 'email'
          );
          expect(emailError?.message).toBe(
            'Please enter a valid email address'
          );
        }
      });
    });

    it('should fail for name too long', () => {
      const longName = 'A'.repeat(101);
      const data = {
        customerName: longName,
        phone: '9876543210',
        address: '123 Main Street',
        state: 'Karnataka',
        pinCode: '560001',
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const nameError = result.error.issues.find(
          (issue) => issue.path[0] === 'customerName'
        );
        expect(nameError?.message).toBe(
          'Customer name must be less than 100 characters'
        );
      }
    });

    it('should fail for address too long', () => {
      const longAddress = 'A'.repeat(501);
      const data = {
        customerName: 'John Doe',
        phone: '9876543210',
        address: longAddress,
        state: 'Karnataka',
        pinCode: '560001',
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const addressError = result.error.issues.find(
          (issue) => issue.path[0] === 'address'
        );
        expect(addressError?.message).toBe(
          'Address must be less than 500 characters'
        );
      }
    });

    it('should fail for remarks too short when provided', () => {
      const data = {
        customerName: 'John Doe',
        phone: '9876543210',
        address: '123 Main Street',
        state: 'Karnataka',
        pinCode: '560001',
        remarks: 'Too short',
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(false);

      if (!result.success) {
        const remarksError = result.error.issues.find(
          (issue) => issue.path[0] === 'remarks'
        );
        expect(remarksError?.message).toBe(
          'Remarks must be at least 10 characters if provided'
        );
      }
    });
  });

  describe('Edge cases', () => {
    it('should accept empty remarks', () => {
      const data = {
        customerName: 'John Doe',
        phone: '9876543210',
        address: '123 Main Street',
        state: 'Karnataka',
        pinCode: '560001',
        remarks: '',
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept undefined optional fields', () => {
      const data = {
        customerName: 'John Doe',
        phone: '9876543210',
        address: '123 Main Street',
        state: 'Karnataka',
        pinCode: '560001',
        email: undefined,
        remarks: undefined,
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should default services to empty array', () => {
      const data = {
        customerName: 'John Doe',
        phone: '9876543210',
        address: '123 Main Street',
        state: 'Karnataka',
        pinCode: '560001',
      };

      const result = addLeadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.services).toEqual([]);
      }
    });
  });
});
