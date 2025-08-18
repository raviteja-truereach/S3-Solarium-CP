# Implementation Backlog: S6-TASK-04 - Detox E2E Test Suite for Customers & Commissions

## Pre-Analysis Phase

### Analysis of Existing Patterns

Based on the current codebase analysis:

1. **Existing E2E Infrastructure**:
   - Detox configuration already established in `.detoxrc.js`
   - E2E test patterns in `e2e/loginSuccess.e2e.ts` and `e2e/otpLockout.e2e.ts`
   - Jest configuration for E2E in `e2e/jest.config.js`
   - Mock OTP handling already present in `LoginScreen.tsx` and `OtpScreen.tsx`

2. **Navigation Patterns**:
   - CustomerStack and CommissionStack already defined in navigation types
   - MainTabNavigator includes Customers tab
   - **Commissions accessed via MainDrawerNavigator, not bottom tabs**
   - Customer screens: `CustomersScreen.tsx`, `CustomerDetailScreen.tsx`
   - Commission screens: `CommissionsScreen.tsx`

3. **Mock Server Patterns**:
   - MockServer class in `__tests__/mocks/mockServer.ts` with preset scenarios
   - Development mode alerts for backend not connected
   - Mock response handling for testing

4. **CI Integration**:
   - GitHub Actions workflows for mobile CI
   - Detox commands in package.json
   - Performance gate workflows

### Top 5 Implementation Pitfalls

1. **Flaky Test Timing**: Not properly waiting for async operations (network requests, navigation transitions, list loading) leading to intermittent failures
2. **Mock Data Inconsistency**: Hardcoding test data that doesn't match actual API response structures causing tests to pass locally but fail with real data
3. **Platform-Specific Selectors**: Using testID/accessibility labels that work on one platform but not the other, causing cross-platform test failures
4. **Insufficient Test Isolation**: Tests depending on state from previous tests or not properly resetting app state between test runs
5. **CI Environment Differences**: Not accounting for slower CI runners, different screen sizes, or missing environment variables causing tests to fail only in CI

---

## Implementation Backlog

### Sub-task 1: Configure Mock Server for E2E Tests (3 points)

**Acceptance Criteria**:
- Mock server returns static OTP "000000" for any phone number
- Mock server provides customer list and detail endpoints
- Mock server provides commission/earnings data endpoints
- All mock responses match actual API contract
- **Mock server runs on port 3000 (not 8081) to avoid Metro bundler conflict**
- **Reuses existing MockServer patterns from `__tests__/mocks/mockServer.ts`**

**Dependencies**:
- Existing mockServer.ts patterns
- API response types from store/api/

**Implementation Approach**:
1. Extend existing MockServer class for E2E-specific configuration
2. Create static mock data matching API contracts
3. Configure OTP endpoint to always return success with "000000"
4. Add customer and commission endpoints with deterministic data
5. **Configure mock server to use port 3000 with environment variable override**
6. Ensure mock server starts before E2E tests and properly shuts down after

**New Code Artifacts**:
- `e2e/mocks/e2eMockServer.ts` - E2E-specific mock server configuration extending base MockServer
- `e2e/mocks/mockData.ts` - Static test data for customers and commissions
- Functions:
  - `createE2EMockServer(port?: number): MockServer` in e2eMockServer.ts
  - `startE2EMockServer(): Promise<MockServer>` in e2eMockServer.ts
  - `stopE2EMockServer(server: MockServer): Promise<void>` in e2eMockServer.ts
  - `getMockCustomers(): Customer[]` in mockData.ts
  - `getMockCommissions(): Commission[]` in mockData.ts

**Expected Outputs**:
- Mock server running on port 3000 during E2E tests
- Consistent mock responses for all test scenarios
- Proper cleanup after test completion

**Testing Requirements**:
- Unit tests for mock data generation
- Verify mock endpoints return expected data structure
- Test mock server startup/shutdown
- Verify port configuration works correctly

---

### Sub-task 2: Create Base E2E Test Utilities with Accessibility Support (2 points)

**Acceptance Criteria**:
- Reusable navigation helpers for common flows including drawer navigation
- Element waiting utilities with proper timeouts
- Test data management utilities
- Platform-specific handling abstracted
- **Accessibility validation helpers for testID/accessibilityLabel presence**
- **Test isolation utilities for proper cleanup between tests**

**Dependencies**:
- Sub-task 1 (mock server configuration)
- Existing Detox setup

**Implementation Approach**:
1. Create base test helpers following existing patterns
2. Implement navigation utilities for tab, stack, and drawer navigation
3. Add element visibility and interaction helpers with accessibility checks
4. Create login flow helper for test setup
5. **Add test isolation helpers for app state reset**
6. **Create CI-aware timeout configuration**

**New Code Artifacts**:
- `e2e/helpers/navigation.ts` - Navigation helper functions including drawer support
- `e2e/helpers/elements.ts` - Element interaction utilities with a11y support
- `e2e/helpers/auth.ts` - Authentication flow helpers
- `e2e/helpers/testIsolation.ts` - Test cleanup and state reset utilities
- `e2e/helpers/accessibility.ts` - Accessibility validation helpers
- Functions:
  - `navigateToTab(tabName: string): Promise<void>` in navigation.ts
  - `openDrawer(): Promise<void>` in navigation.ts
  - `navigateViaDrawer(screenName: string): Promise<void>` in navigation.ts
  - `waitForElementAndTap(matcher: Detox.Matcher, timeout?: number): Promise<void>` in elements.ts
  - `loginWithMockOtp(phoneNumber: string): Promise<void>` in auth.ts
  - `ensureElementVisible(matcher: Detox.Matcher): Promise<void>` in elements.ts
  - `resetAppState(): Promise<void>` in testIsolation.ts
  - `clearAsyncStorage(): Promise<void>` in testIsolation.ts
  - `validateAccessibility(elementMatcher: Detox.Matcher): Promise<void>` in accessibility.ts
  - `getTimeout(baseTimeout: number): number` in elements.ts

**Expected Outputs**:
- Reusable test utilities reducing code duplication
- More stable tests with proper waiting mechanisms
- Consistent test isolation between runs

**Testing Requirements**:
- Helper functions tested in isolation
- Verify helpers work on both iOS and Android
- Validate accessibility checks function correctly

---

### Sub-task 3: Audit and Add testID/accessibilityLabel to Customer & Commission Screens (3 points)

**Acceptance Criteria**:
- All interactive elements in Customer screens have testID attributes
- All interactive elements in Commission screens have testID attributes
- Accessibility labels added where appropriate for screen readers
- Consistent naming convention established and documented
- No duplicate testIDs across screens

**Dependencies**:
- None (can be done independently)

**Implementation Approach**:
1. Audit `CustomersScreen.tsx`, `CustomerDetailScreen.tsx`, `CustomerListItem.tsx`
2. Audit `CommissionsScreen.tsx`, `CommissionListItem.tsx`
3. Add testID to all buttons, inputs, list items, and interactive elements
4. Add accessibilityLabel for complex UI elements
5. Document naming convention in E2E README
6. Create checklist for future screens

**New Code Artifacts**:
- Updates to existing screen files (no new files)
- `e2e/docs/testid-conventions.md` - TestID naming conventions
- Functions:
  - No new functions, only prop additions to existing components

**Expected Outputs**:
- All customer and commission screens have proper test identifiers
- Consistent testID naming across the app
- Documentation for maintaining testIDs

**Testing Requirements**:
- Manual verification of all testIDs
- Run existing unit tests to ensure no regressions
- Create simple E2E test to validate all testIDs are accessible

---

### Sub-task 4: Implement Customer Flow E2E Tests (3 points)

**Acceptance Criteria**:
- Test successful login and navigation to Customers tab
- Test customer list loading and scrolling
- Test customer search functionality
- Test navigation to customer detail screen
- Test customer detail tabs (Profile, Leads, KYC)
- **All tests include proper setup/teardown for isolation**
- **Accessibility validation for key UI elements**

**Dependencies**:
- Sub-task 1 (mock server)
- Sub-task 2 (test utilities)
- Sub-task 3 (testID audit)

**Implementation Approach**:
1. Create customer flow test file following existing patterns
2. **Implement beforeEach with app state reset and mock server setup**
3. **Implement afterEach with proper cleanup**
4. Add login and navigate to customers test
5. Add customer list interaction tests with scroll validation
6. Implement customer detail navigation and tab tests
7. **Include accessibility checks for critical elements**

**New Code Artifacts**:
- `e2e/customerFlow.e2e.ts` - Customer flow E2E tests
- Functions:
  - `beforeEach()` - Test setup with state reset and mock server initialization
  - `afterEach()` - Test cleanup including mock server shutdown
  - Test cases as anonymous functions within describe blocks

**Expected Outputs**:
- Complete E2E coverage of customer flows
- Tests passing on both iOS and Android
- Proper test isolation preventing flaky failures

**Testing Requirements**:
- Cover happy path and edge cases
- Test offline scenarios
- Verify proper error handling
- Ensure < 3 min execution time for customer tests
- Validate accessibility for key flows

---

### Sub-task 5: Implement Earnings/Commission Flow E2E Tests (3 points)

**Acceptance Criteria**:
- **Test navigation to Earnings/Commissions screen via drawer**
- Test commission list loading and filtering
- Test commission search functionality
- Test KPI bar displays correct values
- Test empty state when no commissions
- **All tests include proper setup/teardown for isolation**

**Dependencies**:
- Sub-task 1 (mock server)
- Sub-task 2 (test utilities)
- Sub-task 3 (testID audit)

**Implementation Approach**:
1. Create commission flow test file
2. **Implement navigation to commissions via drawer (not bottom tab)**
3. **Add proper beforeEach/afterEach for test isolation**
4. Add commission list interaction tests
5. Test filter sheet functionality with all status options
6. Verify KPI calculations match mock data

**New Code Artifacts**:
- `e2e/commissionFlow.e2e.ts` - Commission/Earnings flow E2E tests
- Functions:
  - `beforeEach()` - Test setup including drawer navigation prep
  - `afterEach()` - Cleanup routines
  - Individual test cases for each flow

**Expected Outputs**:
- Complete E2E coverage of commission flows
- Validated KPI calculations
- Drawer navigation properly tested

**Testing Requirements**:
- Test all commission status filters
- Verify date range filtering
- Test pagination/infinite scroll
- Ensure < 2 min execution time
- Test drawer navigation specifically

---

### Sub-task 6: Implement Flaky Test Retry Mechanism with CI Timeouts (2 points)

**Acceptance Criteria**:
- Failed tests automatically retry once before marking as failed
- Retry logs clearly indicate which attempt is running
- Final test report shows both attempts if test failed twice
- Retry mechanism doesn't affect passing tests
- **CI-specific timeout configuration implemented**
- **Environment-aware timeout multipliers for slower CI runners**

**Dependencies**:
- Sub-tasks 4 and 5 (test implementations)

**Implementation Approach**:
1. Configure Jest retry using jest-circus test runner
2. Implement custom test reporter for retry logging
3. Add retry configuration to jest.config.js
4. **Add CI-specific timeout configuration via environment variables**
5. **Implement timeout multiplier for CI environments (1.5x - 2x)**
6. Ensure proper cleanup between retries

**New Code Artifacts**:
- `e2e/config/retryConfig.ts` - Retry and timeout configuration
- `e2e/reporters/retryReporter.js` - Custom reporter for retry logging
- `e2e/config/timeouts.ts` - Environment-aware timeout configuration
- Functions:
  - `configureRetry(maxRetries: number): JestConfig` in retryConfig.ts
  - `onTestRetry(test: Test, reason: Error): void` in retryReporter.js
  - `getE2ETimeout(baseTimeout: number): number` in timeouts.ts
  - `isCI(): boolean` in timeouts.ts

**Expected Outputs**:
- Automatic retry of flaky tests
- Clear retry logging in CI
- Appropriate timeouts for CI environment

**Testing Requirements**:
- Test retry mechanism with intentionally flaky test
- Verify cleanup between retries
- Ensure retry doesn't exceed timeout limits
- Validate CI timeout configuration works

---

### Sub-task 7: Integrate E2E Tests into CI Pipeline (3 points)

**Acceptance Criteria**:
- E2E tests run on both iOS simulator and Android emulator in CI
- Tests execute in parallel matrix for faster feedback
- HTML and JUnit reports uploaded as artifacts
- Total execution time < 7 minutes
- Failure blocks PR merge
- **Mock server port configuration passed via environment variable**

**Dependencies**:
- All previous sub-tasks
- Existing CI infrastructure

**Implementation Approach**:
1. Update GitHub Actions workflow for E2E tests
2. Configure test matrix for iOS and Android
3. **Set E2E_MOCK_PORT environment variable to 3000**
4. Add report generation and artifact upload
5. Implement proper caching for faster builds
6. Add status checks for PR protection
7. **Configure CI-specific timeouts via environment variables**

**New Code Artifacts**:
- `.github/workflows/e2e-tests.yml` - Dedicated E2E workflow
- `scripts/run-e2e-ci.sh` - CI-specific E2E runner script
- Functions:
  - Workflow steps defined in YAML
  - Shell script functions for setup and execution

**Expected Outputs**:
- Automated E2E tests on every PR
- Test reports available as CI artifacts
- < 7 min total execution time
- Proper environment configuration

**Testing Requirements**:
- Verify workflow triggers correctly
- Test artifact upload functionality
- Ensure proper failure reporting
- Validate execution time constraints
- Verify environment variables are properly set

---

### Sub-task 8: Documentation and Developer Experience (2 points)

**Acceptance Criteria**:
- README updated with E2E test commands
- Troubleshooting guide for common E2E issues
- Local development setup documented
- CI debugging instructions included
- **TestID conventions and accessibility requirements documented**
- **Port configuration and environment variables documented**

**Dependencies**:
- All implementation sub-tasks

**Implementation Approach**:
1. Update main README with E2E section
2. Create dedicated E2E documentation
3. Add troubleshooting section for common issues
4. **Document mock server port configuration**
5. **Include testID naming conventions and a11y guidelines**
6. **Document test isolation best practices**
7. Include examples of writing new E2E tests

**New Code Artifacts**:
- `e2e/README.md` - Comprehensive E2E documentation
- `docs/e2e-troubleshooting.md` - Troubleshooting guide
- `e2e/docs/testid-conventions.md` - TestID naming guide (from sub-task 3)
- Updates to main `README.md`

**Expected Outputs**:
- Clear documentation for running and writing E2E tests
- Reduced onboarding time for new developers
- Consistent testID usage across team

**Testing Requirements**:
- Documentation reviewed by team member
- Commands tested on fresh environment
- Examples verified to work correctly

---

## Execution Order and Dependencies

1. **Sub-task 1** → Mock Server Configuration (foundation for all tests)
2. **Sub-task 2** → Base Test Utilities (required by test implementations)
3. **Sub-task 3** → TestID Audit (required for stable selectors)
4. **Sub-tasks 4 & 5** → Customer and Commission Tests (can be done in parallel after 1-3)
5. **Sub-task 6** → Retry Mechanism (after tests are written)
6. **Sub-task 7** → CI Integration (after all tests are stable)
7. **Sub-task 8** → Documentation (final step)

## Success Metrics

- All E2E tests passing on both platforms
- Total execution time < 7 minutes in CI
- Zero flaky test failures after retry implementation
- Test coverage for all major user flows
- Clear documentation enabling easy test maintenance
- All interactive elements have proper testID/accessibilityLabel
- Consistent test isolation preventing state leakage