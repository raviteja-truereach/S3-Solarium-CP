# ADR-0007: Sync Scheduler Implementation

[Existing content remains...]

## Manual Refresh Implementation

### Date: 2024-01-XX

### Context
With the implementation of pull-to-refresh functionality across the application, we needed to integrate manual sync triggers with the existing scheduled sync system while preventing abuse and ensuring consistent user experience.

### Decision
We implemented a comprehensive manual refresh system with the following components:

#### 1. Guard Logic
- **30-second minimum interval** between manual sync attempts
- Stored in Redux `networkSlice.nextAllowedSyncAt`
- Prevents spam refreshing while allowing reasonable user-initiated syncs
- Shows user-friendly countdown messages when blocked

#### 2. Component Integration
- **usePullToRefresh**: Generic hook for pull-to-refresh with sync integration
- **useDashboardRefresh**: Dashboard-specific hook with API cache invalidation
- **PullToRefreshControl**: Reusable RefreshControl wrapper with theme consistency

#### 3. User Experience
- **Toast notifications**: Success/error feedback for all sync attempts
- **Accessibility announcements**: Screen reader support for refresh actions
- **Offline awareness**: Different messaging for offline vs online failures
- **Theme consistency**: Proper color schemes across all refresh controls

#### 4. Error Handling
- **Offline detection**: Special handling for `OFFLINE` error responses
- **Auth expiration**: Silent handling of `AUTH_EXPIRED` (no user toast)
- **Generic errors**: User-friendly messages for unexpected failures
- **Guard enforcement**: Consistent interval enforcement across all components

### Implementation Details

```typescript
// Guard logic implementation
export const isSyncAllowed = (currentTime: number, nextAllowedSyncAt: number): boolean => {
  return currentTime >= nextAllowedSyncAt;
};

// Sync source types for tracking
export type SyncSource = 'scheduler' | 'manual' | 'pullToRefresh';



## Amendment: Read-Only Data Hydration (Sprint 2)

### Context
As part of S2-TASK-05 "Dashboard & Lead List – Read-Only Data Binding", we enhanced the sync system to support dashboard metrics alongside entity data synchronization.

### Decision
- Extended `SyncManager.performSync()` to fetch dashboard summary from `/api/v1/leads/summary`
- Enhanced `hydrateReduxSlices()` to dispatch dashboard data to `networkSlice.setDashboardSummary()`
- Dashboard summary is fetched in parallel with leads/customers/quotations for efficiency
- Dashboard data is hydrated into Redux immediately after successful cache persistence

### Implementation Details
- Dashboard summary API returns array format for consistency with other endpoints
- First item in array contains the summary object with fields: `total`, `todayPending`, `overdue`
- Failed dashboard fetch doesn't fail entire sync (non-critical data)
- Dashboard summary is stored in `networkSlice` to avoid state scatter

### Testing
- Unit tests added for `networkSlice` reducer and selectors
- Integration tests verify dashboard summary appears in Redux after `manualSync()`
- Coverage maintained at ≥90% for new slice functionality

*Last updated: Sprint 2, Task 05 - Read-Only Data Binding*


# ADR-0007: Sync Scheduler Implementation

## Status
Accepted - Enhanced in Sprint 2

## Context
[... existing content ...]

## Amendment: UI Data Consumption (Sprint 2 - S2-TASK-05)

### Date
January 2024

### Context
With the implementation of S2-TASK-05 "Dashboard & Lead List – Read-Only Data Binding", the UI layer now actively consumes cached data from the sync system. This represents a significant evolution from the original sync-only design.

### Changes Made

#### Data Flow Enhancement
- **UI Integration**: React components now directly consume Redux state populated by sync operations
- **Live Updates**: Dashboard metrics update automatically when sync completes via Redux subscriptions
- **Cached Data Usage**: UI displays SQLite cached data immediately, even when offline

#### Redux Hydration Pattern
```typescript
// SyncManager now hydrates Redux slices after successful cache persistence
await this.hydrateReduxSlices(persistResult, fetchedData, dashboardSummary);

// Components consume live data via optimized selectors
const dashboardSummary = useAppSelectorShallow(selectDashboardSummary);
const allLeads = useAppSelectorShallow(selectLeads);