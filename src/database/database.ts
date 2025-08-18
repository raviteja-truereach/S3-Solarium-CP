import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { runMigrations, needsMigrations } from './migrations';

// Enable promise support
SQLite.enablePromise(true);

let dbInstance: SQLiteDatabase | null = null;
let isInitializing = false;

export async function openDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log('⏳ Database initialization already in progress, waiting...');
    // Wait for the other initialization to complete
    while (isInitializing && !dbInstance) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return dbInstance!;
  }
  
  isInitializing = true;

  try {
    console.log('🔌 Opening database...');
    dbInstance = await SQLite.openDatabase({
      name: 'solarium.db',
      location: 'default',
    });

    // Run migrations if needed
    const migrationNeeded = await needsMigrations(dbInstance);
    if (migrationNeeded) {
      console.log('🔄 Database migrations needed, running...');
      await runMigrations(dbInstance);
    }

    console.log('✅ Database initialized successfully');
    isInitializing = false;
    return dbInstance;
  } catch (error) {
    isInitializing = false;
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function initializeDatabase(): Promise<SQLiteDatabase> {
  return openDatabase();
}
