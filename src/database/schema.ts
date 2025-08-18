/**
 * Database Schema Definitions
 * Version 2: Added page_number column to leads table for pagination support
 */

// Increment schema version
export const CURRENT_SCHEMA_VERSION = 6;

// Updated leads table with page_number column
export const CREATE_LEADS_TABLE = `
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    status TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    source TEXT,
    product_type TEXT,
    estimated_value REAL,
    follow_up_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    remarks TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    local_changes TEXT DEFAULT '{}',
    customerName TEXT,
    assignedTo TEXT,
    services TEXT,
    page_number INTEGER DEFAULT 1,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
  );
`;

// Indexes for performance optimization
export const CREATE_LEADS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
  CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date);
  CREATE INDEX IF NOT EXISTS idx_leads_page_number ON leads(page_number);
`;

// ADD UPDATED CUSTOMERS TABLE DEFINITION
export const CREATE_CUSTOMERS_TABLE = `
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    kyc_status TEXT CHECK(kyc_status IN ('pending', 'submitted', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    local_changes TEXT DEFAULT '{}'
  );
`;

// UPDATE CUSTOMERS INDEXES
export const CREATE_CUSTOMERS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
  CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
  CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(state);
  CREATE INDEX IF NOT EXISTS idx_customers_kyc_status ON customers(kyc_status);
  CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_customers_phone_search ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_email_search ON customers(email COLLATE NOCASE);
`;

export const CREATE_QUOTATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    items TEXT,
    terms TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    local_changes TEXT DEFAULT '{}',
    FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
  );
`;

export const CREATE_QUOTATIONS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(lead_id);
  CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
  CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
  CREATE INDEX IF NOT EXISTS idx_quotations_sync_status ON quotations(sync_status);
`;

export const CREATE_SYNC_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    last_sync TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_SYNC_METADATA_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_sync_metadata_entity ON sync_metadata(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_sync_metadata_last_sync ON sync_metadata(last_sync);
`;

// UPDATE DOCUMENTS TABLE TO SUPPORT CUSTOMER DOCUMENTS
export const CREATE_DOCUMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    customer_id TEXT,
    doc_type TEXT NOT NULL,
    status TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    local_changes TEXT DEFAULT '{}',
    CHECK ((lead_id IS NOT NULL AND customer_id IS NULL) OR (lead_id IS NULL AND customer_id IS NOT NULL)),
    FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
  );
`;

// UPDATE DOCUMENTS INDEXES
export const CREATE_DOCUMENTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
  CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
  CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);
  CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
`;

/**
 * All table creation statements
 */
export const CREATE_TABLES = [
  CREATE_CUSTOMERS_TABLE,
  CREATE_LEADS_TABLE,
  CREATE_QUOTATIONS_TABLE,
  CREATE_SYNC_METADATA_TABLE,
  CREATE_DOCUMENTS_TABLE,
];

/**
 * All index creation statements
 */
export const CREATE_INDEXES = [
  CREATE_CUSTOMERS_INDEXES,
  CREATE_LEADS_INDEXES,
  CREATE_QUOTATIONS_INDEXES,
  CREATE_SYNC_METADATA_INDEXES,
  CREATE_DOCUMENTS_INDEXES,
];

/**
 * Schema validation queries
 */
export const SCHEMA_VALIDATION_QUERIES = {
  checkLeadsTable: `
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='leads';
  `,
  checkLeadsPageNumberColumn: `
    PRAGMA table_info(leads);
  `,
  checkLeadsIndexes: `
    SELECT name FROM sqlite_master 
    WHERE type='index' AND tbl_name='leads';
  `,
};
