/**
 * Customer API Response Types
 * TypeScript interfaces for customer-related API endpoints
 */

/**
 * Customer item interface for list view (lightweight)
 */
export interface CustomerListItem {
  customerId: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  totalOrders: number;
}

/**
 * Customer detail interface (complete profile)
 */
export interface CustomerDetail {
  customerId: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  status: string;
  totalOrders: number;
  totalValue: number;
  registrationDate: string;
  lastOrderDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get customers list API response
 */
export interface CustomersResponse {
  success: boolean;
  data: {
    items: CustomerListItem[];
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Get customer detail API response
 */
export interface CustomerDetailResponse {
  success: boolean;
  data: CustomerDetail;
}

/**
 * KYC document interface
 */
export interface KycDocument {
  docId: string;
  customerId: string;
  docType: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Get customer documents API response
 */
export interface CustomerDocumentsResponse {
  success: boolean;
  data: {
    documents: KycDocument[];
  };
}

/**
 * Customer query parameters
 */
export interface GetCustomersParams {
  limit?: number;
  offset?: number;
  search?: string;
}
