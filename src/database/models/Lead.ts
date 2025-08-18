/**
 * Lead Entity Model
 * TypeScript interface for Lead database records
 */

export interface Lead {
  id: string;
  customer_id?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  source?: string;
  product_type?: string;
  estimated_value?: number;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  remarks?: string;
  address?: string;
  phone?: string;
  email?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes: string; // JSON string
  customerName?: string;
  assignedTo?: string;
  services?: string[];
}

/**
 * Lead creation interface (optional fields for insert)
 */
export interface CreateLeadRequest {
  id?: string;
  customer_id?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high';
  source?: string;
  product_type?: string;
  estimated_value?: number;
  follow_up_date?: string;
  remarks?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Lead update interface (all fields optional except id)
 */
export interface UpdateLeadRequest {
  id: string;
  customer_id?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  source?: string;
  product_type?: string;
  estimated_value?: number;
  follow_up_date?: string;
  remarks?: string;
  address?: string;
  phone?: string;
  email?: string;
}
