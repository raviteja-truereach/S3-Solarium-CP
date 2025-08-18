import { DatabaseProvider } from '../database/DatabaseProvider';
import React, { useContext } from 'react';
import { DocumentDao } from '../database/dao/DocumentDao';

// Get database instance directly from context
const DatabaseContext = React.createContext<any>(null);

export const testDocumentDaoKyc = async (db: any) => {
  //   const { db } = useDatabase();
  //   if (!db) return;
  if (!db) {
    console.error('❌ Database not available');
    return;
  }

  const documentDao = new DocumentDao(db);

  // Test 1: Find KYC documents
  console.log('🧪 Testing findByCustomerId...');
  const kycDocs = await documentDao.findByCustomerId('CUST-005');
  console.log('✅ KYC documents:', kycDocs.length);

  // Test 2: Get KYC status
  console.log('🧪 Testing getKycStatusByCustomerId...');
  const kycStatus = await documentDao.getKycStatusByCustomerId('CUST-005');
  console.log('✅ KYC status:', kycStatus);
};
