declare module 'react-native-sqlcipher-storage' {
  interface DatabaseConfig {
    name: string;
    version: string;
    displayName: string;
    size: number;
    password: string;
  }

  interface Database {
    transaction: (callback: (tx: any) => void) => void;
  }

  const SQLiteStorage: {
    openDatabase: (config: DatabaseConfig) => Database;
    deleteDatabase: (name: string, callback?: () => void) => void;
  };

  export default SQLiteStorage;
}
