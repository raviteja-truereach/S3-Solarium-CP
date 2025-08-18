# Implementation Backlog: S4-TASK-02 - Quotation List Screen

## Pre-Analysis Phase

### Analysis of Current Codebase

Based on the codebase analysis, I've identified the following patterns and components to reuse:

1. **List Implementation Pattern**: `MyLeadsScreen.tsx` provides the template for paginated lists with search, filters, and pull-to-refresh
2. **RTK Query Integration**: `quotationApi.ts` already has all required endpoints (list, share, PDF)
3. **State Management**: `quotationSlice.ts` and `quotationSelectors.ts` provide normalized state management
4. **Reusable Components**:
   - `SearchBar.tsx` - for quotation search
   - `FilterSheet.tsx` - for status filtering
   - `EmptyLeadsState.tsx` - can be adapted for empty quotations
   - `OfflineBanner.tsx` - for offline indication
   - `FloatingActionButton.tsx` - for create new quotation
5. **Hooks**: `useQuotations.ts` already provides list management logic
6. **Connectivity**: `ConnectivityContext.tsx` for online/offline detection

### Top 5 Implementation Pitfalls

1. **PDF URL Handling**: Opening pre-signed URLs directly with system handlers instead of downloading files. Must use `Linking.openURL()` for simplicity and cross-platform compatibility.

2. **Optimistic Update Rollback**: Not properly implementing rollback when share mutation fails could leave UI in inconsistent state. Must use RTK Query's `onQueryStarted` with proper error handling.

3. **Offline State Synchronization**: Forgetting to update SQLite cache after successful fetch could break offline mode. Must ensure quotation transform is properly integrated and explicitly test cold-start scenarios.

4. **Search Performance**: Implementing search without debouncing could cause performance issues with large datasets. Must reuse the debounced search pattern from SearchBar.

5. **Navigation State Management**: Not properly handling navigation from notifications or deep links to quotation details could cause crashes. Must ensure proper navigation guards.

---

## Sub-task 1: Create Quotation List Screen Component (4 points)

### Acceptance Criteria
- Screen renders with header showing "Quotations" title
- Pull-to-refresh gesture triggers data refresh without throttle
- Screen integrates with bottom tab navigation
- Loading states display during initial fetch

### Dependencies
- Existing navigation setup (MainTabNavigator)
- RTK Query quotation API
- Theme provider

### Implementation Approach
1. Create QuotationsScreen component following MyLeadsScreen pattern
2. Set up basic screen structure with ScreenContainer
3. Integrate useGetQuotationsQuery hook for data fetching
4. Implement pull-to-refresh using RefreshControl
5. Add screen to MainTabNavigator

### New Code Artifacts
**Files:**
- `src/screens/quotations/QuotationsScreen.tsx` - Main screen component
- `src/screens/quotations/QuotationListItem.tsx` - Individual quotation item component

**Functions:**
- `QuotationsScreen()` - Main screen component
- `handleRefresh()` - Pull-to-refresh handler without throttle
- `QuotationListItem({ quotation, onPress, onShare })` - List item component

### Expected Outputs
- Functional quotations screen accessible from bottom tabs
- Basic list rendering with loading states

### Testing Requirements
- Unit tests for QuotationsScreen component
- Test pull-to-refresh functionality
- Test navigation integration
- Coverage target: 80%+

### Additional Specifications
- Follow react-native-paper theming
- Ensure proper TypeScript typing
- Handle empty states gracefully

---

## Sub-task 2: Implement Quotation Search & Filter (3 points)

### Acceptance Criteria
- Search bar allows filtering by lead ID, customer name, or phone
- Filter sheet enables status filtering
- Search updates happen with debouncing
- Clear filters option available

### Dependencies
- Sub-task 1 completion
- Existing SearchBar and FilterSheet components

### Implementation Approach
1. Integrate SearchBar component with quotation-specific placeholder
2. Connect search to quotationSlice setSearchText action
3. Adapt FilterSheet for quotation statuses
4. Use selectFilteredQuotations selector for filtered results

### New Code Artifacts
**Functions (in QuotationsScreen.tsx):**
- `handleSearchSubmit(query: string)` - Search submission handler
- `handleOpenFilter()` - Open filter sheet
- `handleCloseFilter()` - Close filter sheet
- `handleClearFilters()` - Clear all filters

### Expected Outputs
- Functional search with debouncing
- Status-based filtering
- Real-time list updates based on search/filter

### Testing Requirements
- Test search functionality with various inputs
- Test filter application and clearing
- Test debouncing behavior
- Coverage target: 85%+

### Additional Specifications
- Quotation statuses: Generated, Shared, Accepted, Rejected
- Search should be case-insensitive
- Maintain search/filter state during navigation

---

## Sub-task 3: Add Quotation Share Functionality (4 points)

### Acceptance Criteria
- Share button visible on quotations with "Generated" status
- Share action shows loading state during mutation
- Optimistic UI update changes status to "Shared"
- Rollback on failure with error toast
- Share disabled when offline

### Dependencies
- Sub-task 1 completion
- useShareQuotationMutation from quotationApi
- Connectivity context

### Implementation Approach
1. Add share button to QuotationListItem
2. Implement handleShare with optimistic update
3. Use connectivity check before allowing share
4. Show appropriate toast messages
5. Update local state optimistically

### New Code Artifacts
**Functions (in QuotationListItem.tsx):**
- `handleShare(quotationId: string)` - Share action handler with optimistic update
- `isShareEnabled(status: string, isOnline: boolean)` - Determine if share is allowed

**Functions (in QuotationsScreen.tsx):**
- `handleQuotationShare(quotation: Quotation)` - Coordinate share action

### Expected Outputs
- Share functionality with optimistic updates
- Proper error handling and rollback
- Offline prevention with user feedback

### Testing Requirements
- Test share success scenario
- Test share failure with rollback
- Test offline share prevention
- Mock RTK Query mutations
- Coverage target: 85%+

### Additional Specifications
- Use Toast for success/error messages
- Ensure status chip updates immediately
- Log share attempts for debugging

---

## Sub-task 4: Implement PDF Open Functionality (3 points)

### Acceptance Criteria
- View PDF button opens quotation in system viewer/browser
- Loading state displays while fetching PDF URL
- Error handling for 404/timeout with toast message
- PDF opens using platform's default handler
- Offline mode prevents PDF viewing attempts

### Dependencies
- React Native's Linking API
- useGetQuotationPdfQuery from quotationApi
- Connectivity context

### Implementation Approach
1. Implement PDF URL fetch using RTK Query hook
2. Use Linking.openURL() to open pre-signed URL
3. Show loading indicator during URL fetch
4. Implement comprehensive error handling
5. Check connectivity before attempting

### New Code Artifacts
**Files:**
- `src/utils/pdfHandler.ts` - PDF URL handling utilities

**Functions:**
- `openQuotationPdf(quotationId: string): Promise<void>` - Main PDF open handler
- `canOpenPdf(url: string): Promise<boolean>` - Check if URL can be opened
- `handlePdfError(error: any): string` - Error message handler

**Functions (in QuotationListItem.tsx):**
- `handleViewPdf(quotationId: string)` - PDF view trigger

### Expected Outputs
- PDF opens in system default handler
- Proper error messages for failures
- Clean user experience

### Testing Requirements
- Mock Linking.openURL operations
- Test success and failure scenarios
- Test offline prevention
- Test error message generation
- Coverage target: 80%+

### Additional Specifications
- No file system operations required
- Support both iOS and Android URL opening
- Show appropriate error for unsupported URLs

---

## Sub-task 5: Add Offline Support & Caching (4 points)

### Acceptance Criteria
- Quotations list loads from SQLite when offline
- Online fetch updates SQLite cache
- Offline indicator shows when appropriate
- Actions requiring online show disabled state
- Cold-start offline mode displays cached data correctly

### Dependencies
- SQLite transform setup
- QuotationDao implementation
- Connectivity context
- SyncManager integration

### Implementation Approach
1. Verify quotationSlice integrates with SQLite transform
2. Update sync manager to include quotations in sync pipeline
3. Show offline banner when disconnected
4. Disable online-only actions (share, PDF view)
5. Add explicit offline mode verification tests

### New Code Artifacts
**Updates to existing files:**
- `src/sync/SyncManager.ts` - Add quotation sync support
- `src/store/transforms/sqliteTransform.ts` - Verify quotation caching

**Functions (in QuotationsScreen.tsx):**
- `getQuotationSource()` - Determine data source (API vs cache)
- `renderOfflineIndicator()` - Show offline state

**Test files:**
- `__tests__/integration/quotationOfflineMode.test.tsx` - Offline mode verification

### Expected Outputs
- Seamless offline/online transitions
- Cached data available offline
- Clear indication of offline limitations
- Successful cold-start with cached data

### Testing Requirements
- Test offline data loading from SQLite
- Test cache updates after sync
- Test offline action prevention
- Verify cold-start scenarios
- Test cache expiry behavior
- Coverage target: 85%+

### Additional Specifications
- Cache expiry follows existing patterns (24 hours)
- Sync quotations after leads in pipeline
- Show last sync timestamp
- Verify all quotation fields are properly hydrated

---

## Sub-task 6: Create Empty States & Error Handling (2 points)

### Acceptance Criteria
- Empty state shows when no quotations exist
- Different empty states for filtered vs unfiltered
- Error states for fetch failures
- Retry options available

### Dependencies
- EmptyLeadsState component pattern
- Error handling middleware

### Implementation Approach
1. Create QuotationEmptyState component
2. Implement different messages for scenarios
3. Add retry functionality
4. Integrate with error boundary

### New Code Artifacts
**Files:**
- `src/components/quotations/QuotationEmptyState.tsx` - Empty state component

**Functions:**
- `QuotationEmptyState({ type, onRetry })` - Empty state component
- `getEmptyMessage(type: 'none' | 'filtered')` - Message generator

### Expected Outputs
- User-friendly empty states
- Clear action buttons
- Proper error recovery

### Testing Requirements
- Test all empty state variations
- Test retry functionality
- Coverage target: 85%+

### Additional Specifications
- Use consistent icons/illustrations
- Match app theme colors
- Provide actionable next steps

---

## Sub-task 7: Performance Optimization & Testing (3 points)

### Acceptance Criteria
- List renders <1.5s on WiFi (release build) measured via PerformanceObserver
- Smooth scrolling with 100+ items
- No memory leaks
- Performance metrics logged to telemetry
- All acceptance criteria from previous sub-tasks met

### Dependencies
- All previous sub-tasks completed
- PerformanceObserver utility
- TelemetryService integration

### Implementation Approach
1. Implement FlatList optimizations (getItemLayout, keyExtractor)
2. Add performance marks using PerformanceObserver
3. Profile and optimize re-renders
4. Add comprehensive integration tests
5. Integrate performance measurements with CI pipeline

### New Code Artifacts
**Test files:**
- `__tests__/screens/quotations/QuotationsScreen.test.tsx`
- `__tests__/screens/quotations/QuotationListItem.test.tsx`
- `__tests__/integration/quotationFlow.test.tsx`
- `__tests__/performance/quotationListPerformance.test.tsx`
- `e2e/quotationList.e2e.js`

**Functions (in QuotationsScreen.tsx):**
- `measureListRenderTime()` - Performance measurement using PerformanceObserver
- `reportPerformanceMetrics()` - Send metrics to TelemetryService

### Expected Outputs
- Optimized list performance
- Complete test coverage
- Performance benchmarks met
- Metrics reported to telemetry

### Testing Requirements
- Unit tests for all components
- Integration tests for flows
- E2E test for happy path
- Performance tests with assertions
- Verify telemetry reporting
- Coverage target: 80%+ overall

### Additional Specifications
- Use React.memo where appropriate
- Implement proper list item height calculations
- Monitor bundle size impact
- Add performance assertions to CI pipeline
- Report cold-start and refresh timings

---

## Implementation Order & Dependencies

1. **Sub-task 1** → Core screen setup (no dependencies)
2. **Sub-task 2** → Search & filter (depends on 1)
3. **Sub-task 3** → Share functionality (depends on 1)
4. **Sub-task 4** → PDF handling (depends on 1)
5. **Sub-task 5** → Offline support (depends on 1, benefits from 2-4)
6. **Sub-task 6** → Empty states (depends on 1-5)
7. **Sub-task 7** → Optimization & testing (depends on all)

Total Story Points: 23 (split across 7 sub-tasks ranging from 2-4 points each)