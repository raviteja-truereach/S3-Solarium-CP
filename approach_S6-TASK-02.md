# Implementation Backlog: S6-TASK-02 - Commissions / Earnings Screen

## Pre-Analysis Phase

### Analysis of Current Codebase Patterns

Based on the codebase analysis, the following patterns should be reused:

1. **Pagination Pattern**: `usePaginatedCustomers.ts` provides the exact pattern for server-driven pagination with RTK Query
2. **Filter/Search Pattern**: `customerSlice.ts` demonstrates filter state management with memoized selectors
3. **Screen Layout**: `CustomersScreen.tsx` shows the FlatList + FilterSheet + FAB pattern
4. **API Integration**: `customerApi.ts` exemplifies RTK Query endpoint setup with proper typing
5. **DAO Pattern**: `CustomerDao.ts` shows SQLite integration with BaseDao extension
6. **Sync Integration**: `SyncManager.ts` already handles customers and documents - needs commission extension

### Top 5 Implementation Pitfalls

1. **Forgetting Current-Year Default Filter**: Not applying the current-year filter on initial load, causing performance issues by loading all historical data
2. **Duplicating Pagination Logic**: Creating custom pagination instead of reusing the established `usePaginated*` pattern, leading to inconsistent behavior 
3. **Missing Sync Integration**: Not adding commission sync to `SyncManager`, breaking offline functionality
4. **Incorrect KPI Calculations**: Computing KPIs from unfiltered data instead of respecting active filters
5. **Improper Status Handling**: Not accounting for commission status transitions (Pending → Approved → Paid) in UI and state

## Implementation Backlog

### Sub-task 1: Database Layer Setup (3 points)

**Acceptance Criteria:**
- Commission table created with proper schema and indexes
- CommissionDao implemented extending BaseDao
- Database migration v6 successfully runs on app startup

**Dependencies:**
- Existing database infrastructure (BaseDao, migration system)

**Implementation Approach:**
1. Create migration v6 file following v4/v5 pattern
2. Define commission table schema with status, amount, date fields
3. Implement CommissionDao extending BaseDao with specialized queries
4. Add commission-specific indexes for performance

**New Code Artifacts:**
- `src/database/migrations/steps/v6_add_commissions_table.ts` - Migration file
- `src/database/dao/CommissionDao.ts` - DAO implementation
- `src/database/models/Commission.ts` - TypeScript model interface
- Functions in CommissionDao:
  - `findByDateRange(startDate: string, endDate: string): Promise<Commission[]>`
  - `findByStatus(status: string): Promise<Commission[]>` 
  - `getKPIStats(filters: CommissionFilters): Promise<CommissionKPIStats>`
  - `getInstance(db: SQLiteDatabase): CommissionDao`

**Expected Outputs:**
- Commission table created in SQLite with proper constraints
- DAO methods return typed Commission objects
- Migration runs without errors

**Testing Requirements:**
- Unit tests for CommissionDao methods (85% coverage)
- Migration rollback/forward tests
- Test data integrity with various filter combinations

**Additional Specifications:**
- Index on created_at for date filtering performance
- Compound index on (cp_id, status) for filtered queries
- Follow existing sync_status pattern for offline support

### Sub-task 2: API Layer Implementation (3 points)

**Acceptance Criteria:**
- RTK Query endpoints for commission operations defined with cpId parameter
- Proper request/response typing implemented
- Error handling follows existing patterns

**Dependencies:**
- Sub-task 1 (Commission model types)
- Existing baseQuery configuration

**Implementation Approach:**
1. Create commissionApi following customerApi pattern
2. Define getCommissions query with pagination parameters and required cpId
3. Implement proper cache tags for invalidation
4. Add response transformers for data normalization

**New Code Artifacts:**
- `src/store/api/commissionApi.ts` - RTK Query API slice
- `src/types/api/commission.ts` - API type definitions
- Functions in commissionApi:
  - `getCommissions: builder.query<CommissionsResponse, GetCommissionsParams>` (GetCommissionsParams includes cpId: string)
  - `getCommissionById: builder.query<CommissionDetailResponse, {id: string, cpId: string}>`
  - Exports: `useGetCommissionsQuery`, `useLazyGetCommissionsQuery`

**Expected Outputs:**
- API calls return paginated commission data filtered by cpId
- Proper TypeScript typing throughout
- Cache invalidation works correctly

**Testing Requirements:**
- API endpoint tests with mock responses
- Error scenario handling tests
- Cache behavior verification
- Verify cpId parameter is always included in requests

**Additional Specifications:**
- Default page size: 25 items (standardized with other entities)
- Support date range and status filters in query params
- Include total amount calculations in response metadata
- cpId parameter must be extracted from auth state and included in all requests

### Sub-task 3: State Management Implementation (4 points)

**Acceptance Criteria:**
- Commission slice manages filter state and pagination metadata
- KPI selectors calculate totals from filtered data
- Current-year filter applied by default

**Dependencies:**
- Sub-task 1 (Commission types)
- Sub-task 2 (API integration)

**Implementation Approach:**
1. Create commissionSlice following customerSlice pattern
2. Implement filter reducers with current-year default
3. Create memoized selectors for filtered data and KPIs
4. Add pagination state management actions

**New Code Artifacts:**
- `src/store/slices/commissionSlice.ts` - Redux slice
- `src/store/selectors/commissionSelectors.ts` - Memoized selectors
- Functions in commissionSlice:
  - `setDateFilter(state, action: PayloadAction<{startDate: string, endDate: string}>)`
  - `setStatusFilter(state, action: PayloadAction<string[]>)`
  - `resetFilters(state)` - Resets to current year
  - `updateKPITotals(state, action: PayloadAction<CommissionKPIStats>)`
- Selectors:
  - `selectFilteredCommissions` - Returns filtered commission list
  - `selectCommissionKPIs` - Returns calculated KPI totals
  - `selectActiveFilters` - Returns current filter state

**Expected Outputs:**
- Filters update UI immediately
- KPI totals recalculate on filter change
- Pagination state tracks loaded pages

**Testing Requirements:**
- Reducer tests for all actions
- Selector performance tests with large datasets
- Current-year default filter verification

**Additional Specifications:**
- Use reselect for selector memoization
- Store dates as ISO strings for consistency
- KPIs include: total earned, approved, pending, paid amounts

### Sub-task 4: UI Components - Commissions List Screen (4 points)

**Acceptance Criteria:**
- FlatList displays paginated commission records
- Pull-to-refresh updates data
- Empty states for no data/filtered results
- Loading states during pagination
- All interactive elements have proper accessibility labels

**Dependencies:**
- Sub-task 3 (State management)
- Existing UI components (EmptyState, ListItem patterns)

**Implementation Approach:**
1. Create CommissionsScreen following CustomersScreen pattern
2. Implement FlatList with pagination hook
3. Add pull-to-refresh functionality
4. Create commission-specific list item component
5. Add accessibility labels to all interactive elements

**New Code Artifacts:**
- `src/screens/commissions/CommissionsScreen.tsx` - Main screen component
- `src/screens/commissions/CommissionListItem.tsx` - List item component  
- `src/hooks/usePaginatedCommissions.ts` - Pagination hook
- Functions in CommissionsScreen:
  - `handleRefresh(): Promise<void>` - Pull-to-refresh handler
  - `handleLoadMore(): void` - Pagination trigger
  - `renderCommissionItem({item}: {item: Commission}): JSX.Element`
- Functions in usePaginatedCommissions:
  - `usePaginatedCommissions(options: UsePaginatedCommissionsOptions): UsePaginatedCommissionsResult`

**Expected Outputs:**
- Smooth scrolling with 25 items per page
- Visual feedback during loading/refresh
- Proper empty states with action buttons
- Screen reader announces list updates

**Testing Requirements:**
- Screen rendering tests
- User interaction tests (scroll, refresh)
- Empty state scenario tests
- Accessibility tests with screen reader simulation  
- Offline mode tests: pagination, refresh, and empty states while offline

**Additional Specifications:**
- Follow Material Design 3 guidelines
- Support offline mode with cached data
- Accessibility labels for screen readers (list announcements, button hints)
- accessibilityRole and accessibilityLabel on all interactive elements

### Sub-task 5: UI Components - Filters and KPI Bar (3 points)

**Acceptance Criteria:**
- Filter sheet allows date range and status selection
- KPI summary bar shows real-time totals
- Filter badges indicate active filters
- All filter controls meet WCAG 2.1 AA standards

**Dependencies:**
- Sub-task 4 (Main screen setup)
- Existing FilterSheet pattern

**Implementation Approach:**
1. Create CommissionFilterSheet component
2. Implement KPI summary bar with animated values
3. Add filter badge system
4. Wire filter actions to Redux state
5. Ensure proper contrast ratios and touch targets

**New Code Artifacts:**
- `src/components/commissions/CommissionFilterSheet.tsx` - Filter component
- `src/components/commissions/CommissionKPIBar.tsx` - KPI summary component
- `src/components/commissions/EmptyCommissionsState.tsx` - Empty state component
- Functions in CommissionFilterSheet:
  - `handleApplyFilters(): void` - Apply selected filters
  - `handleResetFilters(): void` - Reset to defaults
  - `handleDateRangeSelect(start: Date, end: Date): void`

**Expected Outputs:**
- Filter sheet slides up with smooth animation
- KPI values update instantly on filter change
- Clear visual indicators for active filters
- Screen reader announces filter changes

**Testing Requirements:**
- Component rendering tests
- Filter interaction tests
- KPI calculation accuracy tests
- Accessibility snapshot tests
- Color contrast verification tests

**Additional Specifications:**
- Date picker defaults to current year range
- Status multi-select with "All" option
- KPI bar sticky at top during scroll
- Minimum touch target size of 44x44 points
- High contrast mode support

### Sub-task 6: Navigation Integration (2 points)

**Acceptance Criteria:**
- Commissions screen accessible from side-drawer/overflow menu (not bottom tabs)
- Deep linking support for commission details
- Navigation state properly managed

**Dependencies:**
- Sub-task 4 (Screen implementation)
- Existing navigation structure

**Implementation Approach:**
1. Add Commissions entry to side-drawer/overflow menu
2. Create CommissionStack navigator
3. Update navigation types
4. Configure deep link handling

**New Code Artifacts:**
- `src/navigation/CommissionStack.tsx` - Commission navigation stack
- Updates to `src/navigation/types.ts` - Add commission routes
- Updates to side-drawer component - Add commission menu item
- Updates to `src/navigation/deepLinks.ts` - Add commission patterns
- New types in navigation/types.ts:
  - `CommissionsStackParamList` interface
  - Route definitions for commission screens

**Expected Outputs:**
- Menu item appears in side-drawer/overflow
- Navigation transitions work smoothly
- Deep links resolve correctly

**Testing Requirements:**
- Navigation flow tests
- Deep link resolution tests
- Menu state preservation during app backgrounding

**Additional Specifications:**
- Use money/earnings icon for menu item
- Maintain navigation state during app backgrounding
- Follow existing side-drawer patterns
- Add to overflow menu on smaller screens

### Sub-task 7: Sync Manager Integration (3 points)

**Acceptance Criteria:**
- Commission data syncs as part of atomic batch in `performSync()` method
- Sync progress includes commission status
- Offline cache properly updated
- Commission sync follows same retry/error patterns as other entities

**Dependencies:**
- Sub-task 1 (Database layer)
- Sub-task 2 (API layer)
- Existing SyncManager

**Implementation Approach:**
1. Add commission sync methods to SyncManager
2. Integrate commission sync into existing atomic batch flow
3. Update sync progress events to include commissions
4. Ensure commission sync respects existing transaction boundaries

**New Code Artifacts:**
- Updates to `src/sync/SyncManager.ts` - Add commission sync
- Updates to `src/sync/types.ts` - Add commission types
- New methods in SyncManager:
  - `private async syncCommissionsPageAware(): Promise<{totalRecords: number, pagesProcessed: number}>`
  - `private async fetchCommissionsPage(page: number, pageSize: number): Promise<any>`
  - `private async atomicPersistCommissions(dao: CommissionDao, commissions: Commission[]): Promise<void>`
- Update to `performSync()` to include commission sync in atomic transaction

**Expected Outputs:**
- Commissions sync atomically with other entities
- Progress events fire correctly
- Sync failures don't break other syncs
- Commission data integrity maintained

**Testing Requirements:**
- Sync integration tests
- Offline/online transition tests
- Concurrent sync prevention tests
- Atomic transaction rollback tests
- Verify commission sync uses same error handling as leads/customers

**Additional Specifications:**
- Respect existing sync throttling
- Include commission count in sync results
- Maintain transaction integrity with other entities
- Use same retry logic and exponential backoff
- Commission sync must be part of single database transaction

### Sub-task 8: Testing and Documentation (3 points)

**Acceptance Criteria:**
- Unit test coverage ≥80% overall, ≥85% business logic
- E2E test for commission flow including offline scenarios
- Documentation updated

**Dependencies:**
- All previous sub-tasks completed

**Implementation Approach:**
1. Write comprehensive unit tests for all components
2. Create E2E test scenario with offline mode testing
3. Add accessibility test coverage
4. Update sprint progress documentation
5. Verify coverage targets

**New Code Artifacts:**
- `__tests__/screens/commissions/CommissionsScreen.test.tsx`
- `__tests__/store/slices/commissionSlice.test.ts`
- `__tests__/database/dao/CommissionDao.test.ts`
- `__tests__/a11y/CommissionsScreen.a11y.test.tsx` - Accessibility tests
- `e2e/commissionsFlow.e2e.js` - E2E test scenario including offline mode
- Updates to `sprint-progress-S1-TASK-04B.md`

**Expected Outputs:**
- All tests passing
- Coverage reports meet targets
- Documentation reflects implementation
- Accessibility tests verify WCAG compliance

**Testing Requirements:**
- Unit tests for all public methods
- Integration tests for data flow
- Performance tests for large datasets
- Explicit offline test scenarios (pagination, refresh, empty states)
- Accessibility test coverage for all UI components

**Additional Specifications:**
- Follow existing test patterns
- Include error scenario coverage
- Document any gotchas or edge cases
- Test offline pagination and refresh explicitly
- Verify cpId security in all API tests

## Execution Order

1. Sub-task 1: Database Layer Setup
2. Sub-task 2: API Layer Implementation  
3. Sub-task 3: State Management Implementation
4. Sub-task 4: UI Components - Commissions List Screen
5. Sub-task 5: UI Components - Filters and KPI Bar
6. Sub-task 6: Navigation Integration
7. Sub-task 7: Sync Manager Integration
8. Sub-task 8: Testing and Documentation

Dependencies flow from database → API → state → UI → navigation → sync → testing, ensuring each layer is complete before building the next.