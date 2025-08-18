/**
 * Database Provider - Updated with all required tables
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { openDatabase, SQLiteDatabase } from 'react-native-sqlite-storage';

interface DatabaseContextType {
  db: SQLiteDatabase | null;
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
});

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      console.log('🔄 Initializing database...');

      // Open database
      const database = openDatabase(
        { name: 'solarium.db', location: 'default' },
        () => console.log('✅ Database opened successfully'),
        (error) => console.error('❌ Database open error:', error)
      );

      // Create all required tables
      await createAllTables(database);

      setDb(database);
      setIsReady(true);
      setError(null);
      console.log('✅ Database initialization complete');
    } catch (err) {
      console.error('❌ Database initialization failed:', err);
      setError(
        err instanceof Error ? err.message : 'Database initialization failed'
      );
      setIsReady(false);
    }
  };

  // Create all required tables including sync_metadata
  const createAllTables = async (database: SQLiteDatabase) => {
    try {
      console.log('📋 Creating database tables...');

      // Create leads table with page_number column (v2 schema)
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          `
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
            page_number INTEGER DEFAULT 1
          );
        `,
          [],
          () => {
            console.log('✅ Created leads table');
            resolve();
          },
          (error) => {
            console.error('❌ Failed to create leads table:', error);
            reject(error);
          }
        );
      });

      // Create customers table
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          `
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
            local_changes TEXT DEFAULT '{}'
          );
        `,
          [],
          () => {
            console.log('✅ Created customers table');
            resolve();
          },
          (error) => {
            console.error('❌ Failed to create customers table:', error);
            reject(error);
          }
        );
      });

      // Create quotations table
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          `
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
        `,
          [],
          () => {
            console.log('✅ Created quotations table');
            resolve();
          },
          (error) => {
            console.error('❌ Failed to create quotations table:', error);
            reject(error);
          }
        );
      });

      // Create sync_metadata table (THIS WAS MISSING!)
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          `
          CREATE TABLE IF NOT EXISTS sync_metadata (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            last_sync TEXT NOT NULL,
            sync_version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `,
          [],
          () => {
            console.log('✅ Created sync_metadata table');
            resolve();
          },
          (error) => {
            console.error('❌ Failed to create sync_metadata table:', error);
            reject(error);
          }
        );
      });

      // Create indexes for performance
      await createIndexes(database);

      // Set schema version to 2
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          'PRAGMA user_version = 2;',
          [],
          () => {
            console.log('✅ Set schema version to 2');
            resolve();
          },
          (error) => {
            console.error('❌ Failed to set schema version:', error);
            reject(error);
          }
        );
      });

      console.log('✅ All database tables created successfully');
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
      throw error;
    }
  };

  // Create performance indexes
  const createIndexes = async (database: SQLiteDatabase) => {
    const indexes = [
      // Leads indexes
      'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);',
      'CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);',
      'CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status);',
      'CREATE INDEX IF NOT EXISTS idx_leads_page_number ON leads(page_number);',
      'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date);',

      // Customers indexes
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);',
      'CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);',

      // Quotations indexes
      'CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(lead_id);',
      'CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);',
      'CREATE INDEX IF NOT EXISTS idx_quotations_sync_status ON quotations(sync_status);',

      // Sync metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_sync_metadata_entity ON sync_metadata(entity_type, entity_id);',
      'CREATE INDEX IF NOT EXISTS idx_sync_metadata_last_sync ON sync_metadata(last_sync);',
    ];

    for (const indexQuery of indexes) {
      await new Promise<void>((resolve, reject) => {
        database.executeSql(
          indexQuery,
          [],
          () => {
            resolve();
          },
          (error) => {
            console.error(`❌ Failed to create index: ${indexQuery}`, error);
            reject(error);
          }
        );
      });
    }

    console.log('✅ All database indexes created successfully');
  };

  return (
    <DatabaseContext.Provider value={{ db, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};
