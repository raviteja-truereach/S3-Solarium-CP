## Pre-Analysis Phase

Based on the current codebase analysis, I've identified the following patterns and components to leverage:

### Existing Patterns to Follow:
- **DAO Pattern**: `CustomerDao` already extends `BaseDao` (see `src/database/dao/CustomerDao.ts`)
- **Screen Pattern**: Follow `MyLeadsScreen` and `LeadDetailScreen` implementation patterns
- **API Pattern**: Use RTK Query pattern from `leadApi.ts` with `customBaseQuery`
- **State Management**: `customerSlice` already exists with basic structure
- **Sync Integration**: `SyncManager` already handles leads/customers/quotations
- **Navigation**: Types defined in `src/navigation/types.ts`, need to extend `MainTabParamList`
- **Offline Support**: `ConnectivityContext` and `OfflineBanner` components ready to use
- **Design System**: react-native-paper theme tokens and atomic components established in existing screens

### Top 5 Implementation Pitfalls

1. **Sync Manager Integration Oversight**: Failing to properly update `SyncManager.persistAll()` to handle customer documents alongside customer data, causing KYC status to be out of sync in offline mode.

2. **Navigation Type Misalignment**: Not properly updating `MainTabParamList` and `RootStackParamList` types, causing TypeScript errors and breaking deep-link navigation from leads/notifications.

3. **Pagination Pattern Deviation**: Following incorrect pagination pattern by storing state in Redux slice instead of using RTK Query metadata like `usePaginatedLeads`, leading to sync issues and complexity.

4. **KYC Document Status Mapping**: Assuming KYC status comes from customer endpoint instead of aggregating from documents API, resulting in incorrect status badges.

5. **Cache Rehydration Race Conditions**: Not properly handling the SQLite transform rehydration timing, causing blank screens or stale data on app launch.

---

## Implementation Backlog

### Sub-task 1: Extend Existing Customer and Document APIs with RTK Query Endpoints
**Story Points**: 3

**Acceptance Criteria**:
- Extend existing `customerApi.ts` with list and detail endpoints (no duplication)
- Extend existing `documentApi.ts` with customer documents endpoint
- All endpoints follow existing error handling patterns
- Proper cache tags for invalidation
- Strong TypeScript interfaces for all API responses

**Dependencies**:
- Existing `baseQuery` configuration
- Existing `customerApi.ts` and `documentApi.ts` files

**Implementation Approach**:
1. Extend existing `src/store/api/customerApi.ts` following established patterns
2. Define TypeScript interfaces for API responses with strict typing
3. Add endpoints to customerApi: `getCustomers`, `getCustomerById`
4. Add endpoint to documentApi: `getCustomerDocuments`
5. Configure proper cache tags matching existing pattern
6. Export typed hooks for component consumption

**New Code Artifacts**:
- **Files**:
  - `src/types/api/customer.ts` - TypeScript interfaces for customer API responses
- **Functions**:
  - In `customerApi.ts`: `getCustomers: builder.query<CustomersResponse, { page: number; limit: number; search?: string }>` - Fetch paginated customers
  - In `customerApi.ts`: `getCustomerById: builder.query<CustomerDetailResponse, string>` - Fetch single customer detail
  - In `documentApi.ts`: `getCustomerDocuments: builder.query<DocumentsResponse, string>` - Fetch KYC documents for customer

**Expected Outputs**:
- Three working RTK Query hooks with full TypeScript support
- Proper integration with existing auth and error middleware
- Cache invalidation working across related entities

**Testing Requirements**:
- Unit tests for API transformations
- Mock server responses for all three endpoints
- Error handling scenarios (401, 404, 500)
- Cache invalidation behavior
- TypeScript compile-time checks pass

---

### Sub-task 2: Enhance Customer Slice Following Pagination Pattern
**Story Points**: 3

**Acceptance Criteria**:
- Slice manages only search and filter state (not pagination)
- Pagination derived from RTK Query metadata (following `usePaginatedLeads` pattern)
- Proper selector functions for filtered data
- Integration with SQLite cache data
- Strong TypeScript typing for all state and actions

**Dependencies**:
- Sub-task 1 (Customer API extensions)
- Existing `customerSlice` structure
- `usePaginatedLeads` pattern as reference

**Implementation Approach**:
1. Update `customerSlice` to manage only filters and search (remove pagination state)
2. Add typed actions for search and filter operations
3. Create memoized selectors for filtered/searched customers
4. Implement cache merge logic for offline/online data
5. Create custom hook following `usePaginatedLeads` pattern for pagination

**New Code Artifacts**:
- **Functions** (in `src/store/slices/customerSlice.ts`):
  - `updateSearchTerm(state, action: PayloadAction<string>)` - Update search term
  - `updateFilters(state, action: PayloadAction<CustomerFilters>)` - Update filter criteria
  - `selectFilteredAndSearchedCustomers(state: RootState): Customer[]` - Memoized selector
  - `selectCustomerById(id: string): (state: RootState) => Customer | undefined` - Single customer selector
- **Files**:
  - `src/hooks/usePaginatedCustomers.ts` - Pagination hook following existing pattern

**Expected Outputs**:
- Enhanced customer slice with proper separation of concerns
- Pagination handled via RTK Query, not Redux state
- Full TypeScript support with proper typing

**Testing Requirements**:
- Unit tests for all reducers and selectors
- Test filter combination scenarios
- Search with special characters
- Hook integration tests

---

### Sub-task 3: Extend Customer DAO and Document DAO for Offline Support
**Story Points**: 2

**Acceptance Criteria**:
- Verify existing customer schema meets requirements (no duplicate migrations)
- Extend CustomerDao with efficient search methods
- Extend DocumentDao to support customer document queries
- Add proper indexes only if missing
- Maintain unencrypted storage pattern

**Dependencies**:
- Existing database infrastructure
- Current schema (already includes required fields)

**Implementation Approach**:
1. Audit current schema - add migration ONLY for genuinely new requirements
2. Enhance CustomerDao with optimized search methods
3. Extend DocumentDao with customer-specific queries
4. Add indexes using IF NOT EXISTS for safety
5. Ensure join queries for KYC status calculation

**New Code Artifacts**:
- **Functions** (enhance existing DAOs):
  - In `CustomerDao`: `searchWithFilters(searchTerm: string, filters: CustomerFilters): Promise<Customer[]>` - Filtered search
  - In `DocumentDao`: `findByCustomerId(customerId: string): Promise<Document[]>` - Customer documents
  - In `DocumentDao`: `getKycStatusByCustomerId(customerId: string): Promise<KycStatus>` - Aggregate KYC status
- **Files** (only if new fields needed):
  - `src/database/migrations/steps/v4_customer_indexes.ts` - Add performance indexes

**Expected Outputs**:
- Enhanced DAOs with customer-specific queries
- Efficient search and filter capabilities
- Document queries for KYC status

**Testing Requirements**:
- DAO method tests with SQLite
- Search performance tests
- SQL injection prevention tests
- Index effectiveness verification

---

### Sub-task 4: Integrate Customer Data with Sync Manager
**Story Points**: 3

**Acceptance Criteria**:
- SyncManager fetches and persists customer data
- Document data properly linked to customers
- KYC status calculated from documents
- Sync status properly tracked
- Proper error boundaries and recovery

**Dependencies**:
- Sub-tasks 1, 2, 3
- Existing SyncManager

**Implementation Approach**:
1. Extend existing sync flow to include customer documents
2. Update `persistAll` to handle document-customer relationships
3. Calculate KYC status from document aggregation
4. Ensure atomic transactions for data consistency
5. Handle partial sync failures gracefully

**New Code Artifacts**:
- **Functions** (in `src/sync/SyncManager.ts`):
  - Update existing `performSync` to include document endpoint
  - Enhance `persistCustomers` to calculate KYC status from documents
  - Add `linkDocumentsToCustomers(tx: SQLiteTransaction, documents: Document[]): void` - Link docs in transaction

**Expected Outputs**:
- Customer and document data syncing together
- KYC status correctly calculated and stored
- Robust error handling for partial failures

**Testing Requirements**:
- Integration tests for full sync flow
- Document-customer relationship tests
- KYC status calculation tests
- Transaction rollback scenarios

---

### Sub-task 5: Implement Customers List Screen with Design System
**Story Points**: 4

**Acceptance Criteria**:
- Uses react-native-paper theme tokens and components
- Follows MyLeadsScreen patterns exactly
- Includes SearchBar, FilterSheet, and list components
- Integrates ErrorBoundary and empty states
- Strong prop interfaces for all components
- Pull-to-refresh with proper loading states

**Dependencies**:
- Sub-tasks 1, 2, 4
- Navigation setup
- Existing design system components

**Implementation Approach**:
1. Create screen using existing ScreenContainer and theme
2. Implement FlatList following MyLeadsScreen pattern
3. Reuse/adapt SearchBar component with proper typing
4. Create filter sheet using react-native-paper BottomSheet
5. Wrap in ErrorBoundary, use existing empty state patterns
6. Implement proper TypeScript interfaces for all props

**New Code Artifacts**:
- **Files**:
  - `src/screens/customers/CustomersScreen.tsx` - Main list screen
  - `src/screens/customers/CustomerListItem.tsx` - Row component with prop interface
  - `src/components/customers/CustomerFilterSheet.tsx` - Filter options with typed props
- **Functions**:
  - `CustomersScreen: React.FC` - Main screen component
  - `CustomerListItem: React.FC<CustomerListItemProps>` - Typed list item
  - `usePaginatedCustomers(): PaginatedCustomersResult` - Hook from sub-task 2
  - `handleCustomerPress(customer: Customer): void` - Navigation handler

**Expected Outputs**:
- Pixel-perfect customer list matching app design system
- Smooth pagination using existing pattern
- Proper error and loading states

**Testing Requirements**:
- Component snapshot tests
- Accessibility tests (a11y)
- User interaction tests
- Offline mode behavior
- TypeScript prop validation

---

### Sub-task 6: Implement Customer Detail Screen with Tabs
**Story Points**: 4

**Acceptance Criteria**:
- Uses SegmentedButtons for tabs (like LeadDetailScreen)
- Shows profile, KYC documents, and associated leads
- Integrates with ErrorBoundary and loading states
- Handles deep-link navigation with proper typing
- All components have strict prop interfaces
- Follows established design patterns

**Dependencies**:
- Sub-tasks 1, 2, 4, 5
- Navigation types update

**Implementation Approach**:
1. Create detail screen following LeadDetailScreen structure
2. Use SegmentedButtons for tab navigation
3. Implement three tabs with proper loading states
4. Add deep-link parameter handling with TypeScript
5. Wrap in ErrorBoundary, handle edge cases
6. Define strict interfaces for all component props

**New Code Artifacts**:
- **Files**:
  - `src/screens/customers/CustomerDetailScreen.tsx` - Main detail screen
  - `src/components/customers/CustomerProfileTab.tsx` - Profile tab with props interface
  - `src/components/customers/CustomerKYCTab.tsx` - Documents tab with typed props
  - `src/components/customers/CustomerLeadsTab.tsx` - Leads tab component
- **Functions**:
  - `CustomerDetailScreen: React.FC<CustomerDetailScreenProps>` - Typed screen component
  - `useCustomerDetail(customerId: string): CustomerDetailResult` - Data hook
  - `renderKYCBadge(status: KycStatus): React.ReactElement` - Status renderer
  - `handleDocumentPress(document: Document): void` - Document handler

**Expected Outputs**:
- Feature-complete detail screen with tabs
- Proper loading and error handling
- Deep-link support working

**Testing Requirements**:
- Navigation parameter tests
- Tab switching behavior
- Deep-link scenarios
- Component prop type tests
- Accessibility compliance

---

### Sub-task 7: Configure Navigation with Type Safety
**Story Points**: 2

**Acceptance Criteria**:
- Update all navigation types for full type safety
- Add Customers tab to MainTabNavigator
- Configure deep-link patterns
- Ensure navigation from leads/notifications works
- All route params properly typed

**Dependencies**:
- Sub-tasks 5, 6
- Existing navigation setup

**Implementation Approach**:
1. Update MainTabParamList and RootStackParamList interfaces
2. Add customer screens to appropriate navigators
3. Configure deep-link patterns in existing structure
4. Add Customers tab with proper icon and label
5. Test all navigation paths with TypeScript

**New Code Artifacts**:
- **Updates to existing files**:
  - `src/navigation/types.ts` - Add `Customers: undefined` and `CustomerDetail: { customerId: string }`
  - `src/navigation/MainTabNavigator.tsx` - Add Customers tab entry
  - `src/navigation/deepLinks.ts` - Add patterns: `CUSTOMER_DETAIL: 'customers/:customerId'`
  - `src/navigation/CustomerStack.tsx` - New stack navigator for customer screens

**Expected Outputs**:
- Type-safe navigation throughout app
- Working deep-links to customer details
- Customers tab in main navigation

**Testing Requirements**:
- TypeScript compilation tests
- Navigation flow E2E tests
- Deep-link parsing unit tests
- Tab interaction tests

---

### Sub-task 8: End-to-End Testing and Integration
**Story Points**: 3

**Acceptance Criteria**:
- All unit tests pass with 80%+ coverage
- Business logic coverage 85%+
- Detox E2E tests cover happy paths
- Performance benchmarks documented
- Accessibility (a11y) tests pass

**Dependencies**:
- All previous sub-tasks

**Implementation Approach**:
1. Write comprehensive unit tests for all new code
2. Create Detox scenarios for customer flows
3. Run performance profiling on lists
4. Conduct accessibility audit
5. Update fixtures with realistic customer data

**New Code Artifacts**:
- **Files**:
  - `__tests__/screens/customers/CustomersScreen.test.tsx` - Screen tests
  - `__tests__/screens/customers/CustomerDetailScreen.test.tsx` - Detail tests
  - `__tests__/hooks/usePaginatedCustomers.test.tsx` - Hook tests
  - `e2e/customerFlow.e2e.js` - Detox scenarios
  - `__tests__/fixtures/customerTestData.ts` - Test fixtures

**Expected Outputs**:
- Coverage reports meeting targets
- Passing E2E test suite
- Performance baseline established
- Accessibility compliance verified

**Testing Requirements**:
- Unit coverage: 80%+ overall, 85%+ business logic
- E2E: List, search, filter, detail, deep-link scenarios
- Performance: List render < 100ms, pagination < 50ms
- Accessibility: Screen reader navigation, contrast ratios