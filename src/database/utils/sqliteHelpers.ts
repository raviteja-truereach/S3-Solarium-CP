import type { SQLiteDatabase } from 'react-native-sqlite-storage';

/**
 * Convert callback-based executeSql to Promise
 */
export function executeSqlPromise(
  db: SQLiteDatabase,
  sql: string,
  params: any[] = []
): Promise<any> {
  return new Promise((resolve, reject) => {
    db.executeSql(
      sql,
      params,
      (result) => {
        resolve(result);
      },
      (error) => {
        reject(error);
      }
    );
  });
}