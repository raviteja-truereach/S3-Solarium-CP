## Pre-Analysis Phase

### Analysis of Current Codebase

Based on the existing codebase analysis:

1. **RTK Query Pattern**: The codebase already implements RTK Query with `leadApi.ts` showing patterns for:
   - Query endpoints with transformResponse
   - Mutation endpoints with optimistic updates
   - Tag-based cache invalidation
   - Integration with Redux slices

2. **Redux Store Structure**: 
   - Store is configured with multiple API reducers (baseApi, authApi, leadApi)
   - Uses Redux Persist with selective persistence
   - Has middleware for error handling

3. **TypeScript Models**: 
   - Models are stored in `src/database/models/` and `src/types/`
   - Clear separation between database models and API types

4. **Base Infrastructure**:
   - `customBaseQuery` handles JWT injection and 401 errors
   - Error middleware provides global error handling
   - Existing patterns for offline caching (though read-only)

### Top 5 Implementation Pitfalls

1. **Incomplete Type Safety**: Failing to properly type the complex quotation wizard data structure with all its nested components (panels, inverters, fees, subsidies) leading to runtime errors.

2. **Cache Invalidation Mistakes**: Not properly managing RTK Query cache tags between quotations and leads, causing stale data when status changes or quotations are shared.

3. **Master Data Over-fetching**: Not implementing proper caching strategy for master data, causing unnecessary API calls for static product catalog data.

4. **Offline State Confusion**: Attempting to enable offline quotation creation when specs clearly state CP users need to be online for the entire quotation process.

5. **Status Transition Violations**: Not enforcing the quotation status rules (e.g., CP users can't use "Draft" status, quotations become immutable after sharing).

---

## Implementation Backlog

### Sub-task 1: Create Quotation TypeScript Models and Types
**Story Points**: 2

**Acceptance Criteria**:
- All quotation-related TypeScript interfaces are defined
- Master data types cover panels, inverters, BOM, and fees
- Types align with backend API contracts from L3-FRS-CPAPP
- Types support the 7-step wizard data structure
- No client-side pricing calculation types or functions

**Dependencies**: None

**Implementation Approach**:
1. Define base quotation model matching database schema
2. Create API request/response types for all quotation endpoints
3. Define master data types for products, panels, inverters, fees
4. Create types for quotation wizard state management
5. Add validation type guards for critical data
6. Ensure all pricing fields are read-only from backend responses

**New Code Artifacts**:
- Files:
  - `src/types/api/quotation.ts` - API request/response types
  - `src/types/api/masterData.ts` - Master data API types
  - `src/database/models/Quotation.ts` - Database model (already exists, needs update)
  - `src/types/quotation.ts` - Domain types for quotation logic
- Functions:
  - `isValidQuotationStatus(status: string): boolean` in quotation.ts
  - `isValidQuotationTransition(currentStatus: string, newStatus: string): boolean` in quotation.ts

**Expected Outputs**:
- Fully typed quotation system ready for API integration
- Type safety for all quotation operations
- No client-side pricing logic

**Testing Requirements**:
- Unit tests for type guards
- Tests for status validation functions
- Validation of type compatibility with mock API responses

---

### Sub-task 2: Implement Master Data API with RTK Query
**Story Points**: 3

**Acceptance Criteria**:
- Master data API endpoint implemented with 24-hour caching
- Proper error handling integrated with global error middleware
- Types from Sub-task 1 are properly integrated
- Cache persists across app restarts
- Error responses transformed to user-friendly messages

**Dependencies**: Sub-task 1

**Implementation Approach**:
1. Create masterDataApi using createApi from RTK Query
2. Implement getMasterData query with proper caching configuration
3. Add transformResponse to normalize backend data
4. Configure cache time-to-live for 24 hours
5. Ensure integration with customBaseQuery for error handling
6. Register API in Redux store

**New Code Artifacts**:
- Files:
  - `src/store/api/masterDataApi.ts` - RTK Query API definition
- Functions:
  - `getMasterData()` query endpoint in masterDataApi.ts
  - `transformMasterDataResponse(response: any): MasterData` in masterDataApi.ts
  - `transformMasterDataError(error: any): string` in masterDataApi.ts

**Expected Outputs**:
- Working master data retrieval with automatic caching
- Reduced API calls for static product data
- Consistent error handling with rest of app

**Testing Requirements**:
- Test successful data fetch and transformation
- Test cache behavior (hit/miss scenarios)
- Test error handling for network failures
- Verify 24-hour cache expiration
- Test error message transformation

---

### Sub-task 3: Create Quotation API Endpoints
**Story Points**: 4

**Acceptance Criteria**:
- Required endpoints implemented: list, create, get by ID, share, accept, reject, PDF
- No update/patch mutation for CP role (quotations are immutable after creation)
- Optimistic updates for share/accept/reject operations
- Proper tag invalidation for lead-quotation relationships
- Error handling aligned with existing patterns via customBaseQuery

**Dependencies**: Sub-task 1

**Implementation Approach**:
1. Create quotationApi.ts following leadApi.ts patterns
2. Implement query endpoints: getQuotations, getQuotationById, getQuotationPdf
3. Implement mutations: createQuotation, shareQuotation, acceptQuotation, rejectQuotation
4. Add optimistic updates for share/accept/reject operations
5. Configure proper cache tags and invalidation
6. Ensure all endpoints use customBaseQuery for consistent error handling

**New Code Artifacts**:
- Files:
  - `src/store/api/quotationApi.ts` - RTK Query API for quotations
- Functions:
  - `getQuotations(params: QuotationQueryParams)` query in quotationApi.ts
  - `getQuotationById(id: string)` query in quotationApi.ts
  - `createQuotation(data: CreateQuotationRequest)` mutation in quotationApi.ts
  - `shareQuotation(id: string)` mutation in quotationApi.ts
  - `acceptQuotation(id: string)` mutation in quotationApi.ts
  - `rejectQuotation(id: string)` mutation in quotationApi.ts
  - `getQuotationPdf(id: string)` query in quotationApi.ts

**Expected Outputs**:
- Complete quotation API integration
- Automatic cache management for quotations
- No ability for CP to edit quotations after creation

**Testing Requirements**:
- Test all CRUD operations with mock responses
- Verify optimistic updates and rollbacks
- Test cache invalidation scenarios
- Test error handling for each endpoint
- Verify CP cannot update quotations after creation

---

### Sub-task 4: Implement Quotation Redux Slice with SyncManager Integration
**Story Points**: 3

**Acceptance Criteria**:
- Redux slice manages local quotation state
- Integrates with quotationApi for data synchronization
- Supports wizard state management
- Integrates with SyncManager for offline read scenarios
- Handles data hydration from SQLite cache

**Dependencies**: Sub-task 3

**Implementation Approach**:
1. Create quotationSlice following leadSlice patterns
2. Define initial state structure for quotations and wizard
3. Add reducers for local state management
4. Create selectors for filtered quotation access
5. Add extraReducers to sync with API responses
6. Add reducers for SyncManager hydration similar to leadSlice

**New Code Artifacts**:
- Files:
  - `src/store/slices/quotationSlice.ts` - Redux slice for quotations
- Functions:
  - `setWizardStep(state, action: PayloadAction<number>)` reducer
  - `updateWizardData(state, action: PayloadAction<Partial<QuotationWizardData>>)` reducer
  - `upsertQuotations(state, action: PayloadAction<Quotation[]>)` reducer
  - `clearQuotations(state)` reducer
  - `selectQuotationsByLead(leadId: string)` selector
  - `selectActiveQuotation(state: RootState)` selector

**Expected Outputs**:
- Centralized quotation state management
- Wizard progress tracking
- Offline read support via SyncManager

**Testing Requirements**:
- Test all reducers with various payloads
- Test selector logic for filtering
- Verify state shape matches requirements
- Test integration with API responses
- Test SyncManager hydration scenarios

---

### Sub-task 5: Wire APIs into Redux Store and Configure SyncManager
**Story Points**: 3

**Acceptance Criteria**:
- Both APIs registered in store configuration
- Middleware properly configured
- No conflicts with existing APIs
- Store typing updated to include new slices
- SyncManager extended to handle quotations endpoint
- SQLite transform updated for quotation persistence

**Dependencies**: Sub-tasks 2, 3, 4

**Implementation Approach**:
1. Import new APIs and slice into store/index.ts
2. Add API reducers to combineReducers
3. Add API middleware to middleware chain
4. Update RootState type exports
5. Update SyncManager to include quotations in fetch operations
6. Extend SQLiteTransform to handle quotation data

**New Code Artifacts**:
- Files: 
  - Updates to `src/store/index.ts`
  - Updates to `src/sync/SyncManager.ts`
  - Updates to `src/store/transforms/sqliteTransform.ts`
- Functions:
  - `loadQuotationsFromCache()` in sqliteTransform.ts
  - Updates to `performSync()` in SyncManager.ts to include quotations

**Expected Outputs**:
- Fully integrated quotation and master data functionality
- Working API calls through Redux
- Offline read capability for quotations

**Testing Requirements**:
- Integration tests verifying store configuration
- Test that all APIs can be dispatched
- Verify no regression in existing functionality
- Test SyncManager quotation fetching
- Test offline data availability

---

### Sub-task 6: Create Hook Abstractions
**Story Points**: 2

**Acceptance Criteria**:
- Custom hooks provide clean API access
- Hooks handle loading and error states
- TypeScript inference works correctly
- Follows existing hook patterns
- Error states provide user-friendly messages

**Dependencies**: Sub-task 5

**Implementation Approach**:
1. Create useQuotations hook for list access
2. Create useMasterData hook with caching logic
3. Create useQuotationWizard hook for wizard state
4. Add proper TypeScript return types
5. Handle edge cases like empty results
6. Transform technical errors to user-friendly messages

**New Code Artifacts**:
- Files:
  - `src/hooks/useQuotations.ts` - Quotation-related hooks
  - `src/hooks/useMasterData.ts` - Master data hook
- Functions:
  - `useQuotations(params?: QuotationQueryParams)` in useQuotations.ts
  - `useQuotationById(id: string)` in useQuotations.ts
  - `useCreateQuotation()` in useQuotations.ts
  - `useShareQuotation()` in useQuotations.ts
  - `useMasterData()` in useMasterData.ts
  - `useQuotationWizard()` in useQuotations.ts

**Expected Outputs**:
- Clean, reusable hooks for UI components
- Consistent patterns across the app
- User-friendly error messages

**Testing Requirements**:
- Test hooks with React Testing Library
- Verify loading states and error handling
- Test parameter changes and re-fetching
- Ensure proper cleanup on unmount
- Test error message transformation

---

### Sub-task 7: Comprehensive Testing Suite
**Story Points**: 3

**Acceptance Criteria**:
- Unit tests achieve ≥80% line coverage
- Business logic has ≥85% coverage
- All API endpoints have integration tests
- No increase in CI pipeline time >1 minute
- Error handling paths fully tested

**Dependencies**: All previous sub-tasks

**Implementation Approach**:
1. Write unit tests for all reducers and selectors
2. Create API integration tests with MSW
3. Test error scenarios and edge cases
4. Add performance tests for large quotation lists
5. Verify coverage meets requirements
6. Test SyncManager integration scenarios

**New Code Artifacts**:
- Files:
  - `__tests__/store/api/quotationApi.test.ts`
  - `__tests__/store/api/masterDataApi.test.ts`
  - `__tests__/store/slices/quotationSlice.test.ts`
  - `__tests__/hooks/useQuotations.test.tsx`
  - `__tests__/hooks/useMasterData.test.tsx`
  - `__tests__/types/quotation.test.ts`
  - `__tests__/integration/quotationSync.test.ts`

**Expected Outputs**:
- Comprehensive test coverage
- CI pipeline remains performant
- All error paths tested

**Testing Requirements**:
- Mock all external dependencies
- Test both success and failure paths
- Verify Redux state updates
- Test React hook lifecycle
- Run coverage reports to verify thresholds
- Test offline scenarios with SyncManager

---

### Execution Order and Dependencies

1. **Sub-task 1** → Define all types (no dependencies)
2. **Sub-task 2** → Master Data API (depends on Sub-task 1)
3. **Sub-task 3** → Quotation API (depends on Sub-task 1, parallel with Sub-task 2)
4. **Sub-task 4** → Redux Slice (depends on Sub-task 3)
5. **Sub-task 5** → Store Integration (depends on Sub-tasks 2, 3, 4)
6. **Sub-task 6** → Hook Abstractions (depends on Sub-task 5)
7. **Sub-task 7** → Testing Suite (depends on all previous)

Total Story Points: 22 (fits within a 2-week sprint)