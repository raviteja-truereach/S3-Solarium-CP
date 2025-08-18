/**
 * Customer Entity Model
 * TypeScript interface for Customer database records
 */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at: string;
  updated_at: string;
  kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected';
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes: string; // JSON string
}

/**
 * Customer creation interface
 */
export interface CreateCustomerRequest {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

/**
 * Customer update interface
 */
export interface UpdateCustomerRequest {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  kyc_status?: 'pending' | 'submitted' | 'approved' | 'rejected';
}
