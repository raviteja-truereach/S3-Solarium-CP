/**
 * Temporary test file for Customer API verification
 * Run this in your app to test the new endpoints
 */

import { store } from '../store';
import { customerApi } from '../store/api/customerApi';
import { documentApi } from '../store/api/documentApi';

export const testCustomerApis = async () => {
  console.log('🧪 Testing Customer APIs...');

  try {
    // Test 1: Get customers list
    console.log('📋 Testing getCustomers...');
    const customersResult = await store.dispatch(
      customerApi.endpoints.getCustomers.initiate({ limit: 10, offset: 0 })
    );
    console.log('✅ Customers result:', customersResult);

    if (customersResult.data?.data?.items?.length > 0) {
      const firstCustomer = customersResult.data.data.items[0];

      // Test 2: Get customer detail
      console.log('👤 Testing getCustomerById with:', firstCustomer.customerId);
      const detailResult = await store.dispatch(
        customerApi.endpoints.getCustomerById.initiate(firstCustomer.customerId)
      );
      console.log('✅ Customer detail result:', detailResult);

      // Test 3: Get customer documents
      console.log('📄 Testing getCustomerDocuments...');
      const docsResult = await store.dispatch(
        documentApi.endpoints.getCustomerDocuments.initiate(
          firstCustomer.customerId
        )
      );
      console.log('✅ Customer documents result:', docsResult);
    }

    console.log('🎉 All Customer API tests completed!');
  } catch (error) {
    console.error('❌ Customer API test failed:', error);
  }
};
