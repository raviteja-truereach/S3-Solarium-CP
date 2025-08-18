import { DatabaseProvider } from '../database/DatabaseProvider';
import React, { useContext } from 'react';
import { CustomerDao } from '../database/dao/CustomerDao';

// Get database instance directly from context
const DatabaseContext = React.createContext<any>(null);

export const testCustomerDaoSearch = async (db: any) => {
  if (!db) {
    console.error('❌ Database not available');
    return;
  }

  const customerDao = new CustomerDao(db);

  // Test 1: Search with filters
  console.log('🧪 Testing searchWithFilters...');
  const results1 = await customerDao.searchWithFilters('john', {
    kycStatus: 'pending',
    city: 'Mumbai',
  });
  console.log('✅ Search results:', results1.length);

  // Test 2: Get filter options
  console.log('🧪 Testing getFilterOptions...');
  const options = await customerDao.getFilterOptions();
  console.log('✅ Filter options:', options);

  // Test 3: Count with filters
  console.log('🧪 Testing countWithFilters...');
  const count = await customerDao.countWithFilters('', {
    kycStatus: 'approved',
  });
  console.log('✅ Approved customers count:', count);
};
