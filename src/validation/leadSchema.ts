/**
 * Lead Form Validation Schema (Simple JavaScript validation)
 * Validation for lead creation form inputs
 */

/**
 * Phone number validation regex (10 digits)
 */
const phoneRegex = /^\d{10}$/;

/**
 * PIN code validation regex (6 digits)
 */
const pinCodeRegex = /^\d{6}$/;

/**
 * Email validation regex
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Add Lead Form Data Interface
 */
export interface NewLeadFormData {
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  state: string;
  pinCode: string;
  services?: string[];
  documents?: { name: string; uri: string; type: string }[];
}

/**
 * Validation Error Interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Individual field validators
 */
export const validators = {
  customerName: (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Customer name is required';
    }
    if (value.trim().length > 100) {
      return 'Customer name must be less than 100 characters';
    }
    return null;
  },

  phone: (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Phone number is required';
    }
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid 10-digit phone number';
    }
    return null;
  },

  email: (value?: string): string | null => {
    if (value && value.trim().length > 0 && !emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  address: (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Address is required';
    }
    if (value.trim().length > 500) {
      return 'Address must be less than 500 characters';
    }
    return null;
  },

  state: (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Please select a state';
    }
    return null;
  },

  pinCode: (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'PIN code is required';
    }
    if (!pinCodeRegex.test(value)) {
      return 'Please enter a valid 6-digit PIN code';
    }
    return null;
  },

  remarks: (value?: string): string | null => {
    if (value && value.trim().length > 0 && value.trim().length < 10) {
      return 'Remarks must be at least 10 characters if provided';
    }
    return null;
  },
};

/**
 * Validate entire form
 */
export const validateAddLeadForm = (
  data: Partial<NewLeadFormData>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate each field
  const customerNameError = validators.customerName(data.customerName || '');
  if (customerNameError) errors.customerName = customerNameError;

  const phoneError = validators.phone(data.phone || '');
  if (phoneError) errors.phone = phoneError;

  const emailError = validators.email(data.email);
  if (emailError) errors.email = emailError;

  const addressError = validators.address(data.address || '');
  if (addressError) errors.address = addressError;

  const stateError = validators.state(data.state || '');
  if (stateError) errors.state = stateError;

  const pinCodeError = validators.pinCode(data.pinCode || '');
  if (pinCodeError) errors.pinCode = pinCodeError;
  console.log('errors ---->', errors);
  // const remarksError = validators.remarks(data.remarks);
  // if (remarksError) errors.remarks = remarksError;

  return errors;
};

/**
 * Check if form is valid
 */
export const isFormValid = (data: Partial<NewLeadFormData>): boolean => {
  const errors = validateAddLeadForm(data);
  return Object.keys(errors).length === 0;
};

/**
 * Default form values
 */
export const defaultLeadFormValues: NewLeadFormData = {
  customerName: '',
  phone: '',
  email: '',
  address: '',
  state: '',
  pinCode: '',
  services: [],
  remarks: '',
};

/**
 * List of Indian states for dropdown
 */
export const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
  'Andaman and Nicobar Islands',
];

/**
 * List of available services
 */
export const availableServices = [
  'Solar Panel Installation',
  'Solar Water Heater',
  'Solar Street Light',
  'Solar Home Lighting System',
  'Solar Pump',
  'Rooftop Solar',
  'Ground Mount Solar',
  'Solar Maintenance',
  'Other',
];
