/**
 * Comprehensive Test Runner
 * Runs all test suites and generates reports
 */

// Import all test files to ensure they're included
import './components/common/ErrorBoundary.test';
import './components/common/OfflineBanner.test';
import './contexts/ConnectivityContext.test';
import './store/api/baseQuery.test';
import './store/api/baseApi.test';
import './store/middleware/errorMiddleware.test';
import './utils/errorMessage.test';
import './config/Network.test';
import './integration/networkLayer.integration.test';
import './integration/errorHandling.integration.test';

console.log('🧪 All test suites loaded for comprehensive testing');

export default {};
