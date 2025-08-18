/**
 * Lead Schema Integration Tests
 * Tests validation schema with real form scenarios
 */
import {
  validateAddLeadForm,
  isFormValid,
  validators,
  NewLeadFormData,
} from '../../src/validation/leadSchema';

describe('Lead Schema Integration', () => {
  describe('Real Form Scenarios', () => {
    it('should validate complete valid lead form', () => {
      const validLead: NewLeadFormData = {
        customerName: 'John Doe Smith',
        phone: '9876543210',
        email: 'john.doe@example.com',
        address: '123 Main Street, Tech Park',
        state: 'Karnataka',
        pinCode: '560001',
        services: ['SRV001', 'SRV002'],
        documents: [],
      };

      const errors = validateAddLeadForm(validLead);
      expect(Object.keys(errors)).toHaveLength(0);
      expect(isFormValid(validLead)).toBe(true);
    });

    it('should validate minimal required lead form', () => {
      const minimalLead: NewLeadFormData = {
        customerName: 'Jane',
        phone: '8765432109',
        address: 'Simple Address',
        state: 'Maharashtra',
        pinCode: '400001',
        services: [],
        documents: [],
      };

      const errors = validateAddLeadForm(minimalLead);
      expect(Object.keys(errors)).toHaveLength(0);
      expect(isFormValid(minimalLead)).toBe(true);
    });

    it('should handle edge case validations', () => {
      const edgeCases = [
        {
          name: 'single character name',
          data: {
            customerName: 'A',
            phone: '9876543210',
            address: 'Address',
            state: 'Karnataka',
            pinCode: '560001',
            services: [],
            documents: [],
          },
          shouldBeValid: true,
        },
        {
          name: '100 character name',
          data: {
            customerName: 'A'.repeat(100),
            phone: '9876543210',
            address: 'Address',
            state: 'Karnataka',
            pinCode: '560001',
            services: [],
            documents: [],
          },
          shouldBeValid: true,
        },
        {
          name: '101 character name',
          data: {
            customerName: 'A'.repeat(101),
            phone: '9876543210',
            address: 'Address',
            state: 'Karnataka',
            pinCode: '560001',
            services: [],
            documents: [],
          },
          shouldBeValid: false,
        },
        {
          name: 'phone with exact 10 digits',
          data: {
            customerName: 'John',
            phone: '1234567890',
            address: 'Address',
            state: 'Karnataka',
            pinCode: '560001',
            services: [],
            documents: [],
          },
          shouldBeValid: true,
        },
        {
          name: 'phone with 9 digits',
          data: {
            customerName: 'John',
            phone: '123456789',
            address: 'Address',
            state: 'Karnataka',
            pinCode: '560001',
            services: [],
            documents: [],
          },
          shouldBeValid: false,
        },
      ];

      edgeCases.forEach(({ name, data, shouldBeValid }) => {
        const errors = validateAddLeadForm(data as NewLeadFormData);
        const valid = Object.keys(errors).length === 0;

        expect(valid).toBe(shouldBeValid);

        if (!shouldBeValid) {
          expect(Object.keys(errors).length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Individual Validator Performance', () => {
    it('should validate customer name efficiently', () => {
      const startTime = performance.now();

      // Run validation 1000 times
      for (let i = 0; i < 1000; i++) {
        validators.customerName(`Customer ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 100ms for 1000 validations
      expect(duration).toBeLessThan(100);
    });

    it('should validate phone numbers efficiently', () => {
      const startTime = performance.now();

      const phoneNumbers = [
        '9876543210',
        '8765432109',
        '7654321098',
        '6543210987',
        '5432109876',
        '123',
        '12345678901',
        'abcd123456',
        '98765-43210',
        '',
      ];

      // Run validation 100 times for each phone
      phoneNumbers.forEach((phone) => {
        for (let i = 0; i < 100; i++) {
          validators.phone(phone);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 50ms for 1000 phone validations
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Error Message Consistency', () => {
    it('should provide consistent error messages', () => {
      const invalidData: Partial<NewLeadFormData> = {
        customerName: '',
        phone: '123',
        email: 'invalid-email',
        address: '',
        state: '',
        pinCode: '123',
        services: [],
        documents: [],
      };

      const errors = validateAddLeadForm(invalidData);

      expect(errors.customerName).toBe('Customer name is required');
      expect(errors.phone).toBe('Please enter a valid 10-digit phone number');
      expect(errors.email).toBe('Please enter a valid email address');
      expect(errors.address).toBe('Address is required');
      expect(errors.state).toBe('Please select a state');
      expect(errors.pinCode).toBe('Please enter a valid 6-digit PIN code');
    });
  });
});
