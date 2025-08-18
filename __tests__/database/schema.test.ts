/**
 * Database Schema Tests
 * Tests schema definition and SQL statement validity
 */
import {
  CURRENT_SCHEMA_VERSION,
  CREATE_TABLES,
  CREATE_INDEXES,
  INITIALIZE_SYNC_METADATA,
} from '../../src/database/schema';

describe('Database Schema', () => {
  describe('Schema Version', () => {
    it('should have valid current version', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1);
      expect(typeof CURRENT_SCHEMA_VERSION).toBe('number');
    });
  });

  describe('Table Creation', () => {
    it('should have all required tables', () => {
      expect(CREATE_TABLES).toHaveLength(4);

      const sqlStatements = CREATE_TABLES.join(' ');
      expect(sqlStatements).toContain('CREATE TABLE IF NOT EXISTS customers');
      expect(sqlStatements).toContain('CREATE TABLE IF NOT EXISTS leads');
      expect(sqlStatements).toContain('CREATE TABLE IF NOT EXISTS quotations');
      expect(sqlStatements).toContain(
        'CREATE TABLE IF NOT EXISTS sync_metadata'
      );
    });

    it('should have valid SQL syntax for tables', () => {
      CREATE_TABLES.forEach((sql) => {
        expect(sql.trim()).toMatch(/^CREATE TABLE IF NOT EXISTS \w+/);
        expect(sql).toContain('(');
        expect(sql).toContain(')');
      });
    });
  });

  describe('Indexes', () => {
    it('should have performance indexes', () => {
      expect(CREATE_INDEXES.length).toBeGreaterThan(0);

      CREATE_INDEXES.forEach((sql) => {
        expect(sql.trim()).toMatch(/^CREATE INDEX IF NOT EXISTS/);
        expect(sql).toContain('ON ');
      });
    });
  });

  describe('Sync Metadata Initialization', () => {
    it('should initialize required sync entries', () => {
      expect(INITIALIZE_SYNC_METADATA).toContain('INSERT OR IGNORE');
      expect(INITIALIZE_SYNC_METADATA).toContain('leads');
      expect(INITIALIZE_SYNC_METADATA).toContain('customers');
      expect(INITIALIZE_SYNC_METADATA).toContain('quotations');
    });
  });
});
