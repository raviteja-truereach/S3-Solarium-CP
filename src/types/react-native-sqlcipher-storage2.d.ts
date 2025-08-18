declare module 'react-native-sqlcipher-storage2' {
  interface DatabaseConfig {
    name: string;
    key: string;
    location?: string;
    createFromLocation?: string;
  }

  interface Database {
    transaction: (
      callback: (tx: any) => void,
      error?: (error: any) => void,
      success?: () => void
    ) => void;
  }

  const SQLiteStorage: {
    openDatabase: (config: DatabaseConfig) => Database;
    deleteDatabase: (
      config: DatabaseConfig,
      success?: () => void,
      error?: (error: any) => void
    ) => void;
  };

  export default SQLiteStorage;
}
