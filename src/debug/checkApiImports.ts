export const checkApiImports = () => {
  console.log('🔍 Checking API Imports:');

  try {
    const { baseApi } = require('../store/api/baseApi');
    console.log('  ✅ baseApi:', !!baseApi, baseApi?.reducerPath);
  } catch (error) {
    console.log('  ❌ baseApi failed:', error.message);
  }

  try {
    const { authApi } = require('../store/api/authApi');
    console.log('  ✅ authApi:', !!authApi, authApi?.reducerPath);
  } catch (error) {
    console.log('  ❌ authApi failed:', error.message);
  }

  try {
    const { dashboardApi } = require('../store/api/dashboardApi');
    console.log(
      '  ✅ dashboardApi:',
      !!dashboardApi,
      dashboardApi?.reducerPath
    );
  } catch (error) {
    console.log('  ❌ dashboardApi failed:', error.message);
  }

  try {
    const {
      simpleNotificationsApi,
    } = require('../store/api/simpleNotificationsApi');
    console.log(
      '  ✅ simpleNotificationsApi:',
      !!simpleNotificationsApi,
      simpleNotificationsApi?.reducerPath
    );
  } catch (error) {
    console.log('  ❌ simpleNotificationsApi failed:', error.message);
  }
};
