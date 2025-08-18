/**
 * Base Data Access Object
 * Provides common database operations for all entities
 */
import type { SQLiteDatabase, SQLiteTransaction } from '../database';

/**
 * Base DAO class with common CRUD operations
 * All entity DAOs should extend this class
 */
export abstract class BaseDao<T> {
  protected db: SQLiteDatabase;
  protected abstract tableName: string;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Get table name for the entity
   */
  protected getTableName(): string {
    return this.tableName;
  }

  /**
   * Find all records in the table
   * @param whereClause - Optional WHERE clause
   * @param params - Parameters for the WHERE clause
   * @returns Promise<T[]> - Array of records
   */
  async findAll(whereClause?: string, params?: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const sql = whereClause
        ? `SELECT * FROM ${this.getTableName()} WHERE ${whereClause}`
        : `SELECT * FROM ${this.getTableName()}`;

      this.db.transaction((tx) => {
        tx.executeSql(
          sql,
          params || [],
          (_, result) => {
            const rows: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i) as T);
            }
            resolve(rows);
          },
          (_, error) => {
            console.error(
              `Failed to find all records in ${this.getTableName()}:`,
              error
            );
            reject(new Error(`Database query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Find a record by ID
   * @param id - Record ID
   * @returns Promise<T | undefined> - Record or undefined if not found
   */
  async findById(id: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM ${this.getTableName()} WHERE id = ? LIMIT 1`,
          [id],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0) as T);
            } else {
              resolve(undefined);
            }
          },
          (_, error) => {
            console.error(
              `Failed to find record by ID in ${this.getTableName()}:`,
              error
            );
            reject(new Error(`Database query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Insert or update multiple records in a single transaction
   * @param records - Array of records to upsert
   * @returns Promise<void>
   */
  async upsertAll(records: Partial<T>[]): Promise<void> {
    if (records.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          records.forEach((record) => {
            const { sql, params } = this.buildUpsertQuery(record);
            tx.executeSql(
              sql,
              params,
              () => {
                // Success for individual record
              },
              (_, error) => {
                console.error(
                  `Failed to upsert record in ${this.getTableName()}:`,
                  error
                );
                throw new Error(`Upsert failed: ${error.message}`);
              }
            );
          });
        },
        (error) => {
          console.error(
            `Transaction failed for ${this.getTableName()}:`,
            error
          );
          reject(new Error(`Transaction failed: ${error.message}`));
        },
        () => {
          console.log(
            `Successfully upserted ${
              records.length
            } records in ${this.getTableName()}`
          );
          resolve();
        }
      );
    });
  }

  /**
   * Delete all records from the table
   * @param whereClause - Optional WHERE clause
   * @param params - Parameters for the WHERE clause
   * @returns Promise<number> - Number of deleted records
   */
  async deleteAll(whereClause?: string, params?: any[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = whereClause
        ? `DELETE FROM ${this.getTableName()} WHERE ${whereClause}`
        : `DELETE FROM ${this.getTableName()}`;

      this.db.transaction((tx) => {
        tx.executeSql(
          sql,
          params || [],
          (_, result) => {
            console.log(
              `Deleted ${
                result.rowsAffected
              } records from ${this.getTableName()}`
            );
            resolve(result.rowsAffected);
          },
          (_, error) => {
            console.error(
              `Failed to delete records from ${this.getTableName()}:`,
              error
            );
            reject(new Error(`Delete failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Get record count
   * @param whereClause - Optional WHERE clause
   * @param params - Parameters for the WHERE clause
   * @returns Promise<number> - Number of records
   */
  async count(whereClause?: string, params?: any[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = whereClause
        ? `SELECT COUNT(*) as count FROM ${this.getTableName()} WHERE ${whereClause}`
        : `SELECT COUNT(*) as count FROM ${this.getTableName()}`;

      this.db.transaction((tx) => {
        tx.executeSql(
          sql,
          params || [],
          (_, result) => {
            const count = result.rows.item(0).count;
            resolve(count);
          },
          (_, error) => {
            console.error(
              `Failed to count records in ${this.getTableName()}:`,
              error
            );
            reject(new Error(`Count query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Build INSERT OR REPLACE query for upsert operation
   * Subclasses should override this method to provide entity-specific logic
   * @param record - Record to upsert
   * @returns Object with sql string and params array
   */
  protected abstract buildUpsertQuery(record: Partial<T>): {
    sql: string;
    params: any[];
  };

  /**
   * Add timestamps to record for insert/update operations
   * @param record - Record to add timestamps to
   * @param isUpdate - Whether this is an update operation
   * @returns Record with timestamps
   */
  protected addTimestamps(record: any, isUpdate: boolean = false): any {
    const now = new Date().toISOString();

    if (!isUpdate) {
      record.created_at = now;
    }
    record.updated_at = now;

    return record;
  }

  /**
   * Generate UUID for new records
   * @returns string - UUID
   */
  protected generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
