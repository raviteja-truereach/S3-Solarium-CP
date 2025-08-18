Implementation Backlog – S3-TASK-01 “Dashboard Screen & KPI Widgets”

GLOBAL ASSUMPTIONS  
• Mobile code-base = SOLARIUM-CPAPP (React-Native 0.71 + Redux Toolkit).  
• Existing modules to be re-used: SyncManager, SyncScheduler, networkSlice, DashboardStatCard, OfflineBanner, ConnectivityContext, Toast, RTK Query infra.  
• All new Redux state must be persisted through redux-persist and encrypted SQLite transform.  
• All new business-logic code must reach 85 %+ line coverage; overall repo ≥ 80 %.  
• Naming conventions: kebab-case file names; PascalCase React components.

--------------------------------------------------------------------
EPIC  :  S3-TASK-01  Dashboard Screen & KPI Widgets
--------------------------------------------------------------------

SUB-TASK 1  – CPAPP-STATE-ENHANCE  
Story Points: 3  
Component(s): CPAPP-STATE  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. networkSlice holds two new fields: unreadNotificationCount:number, lastSyncTs:string | undefined.  
   b. Selectors selectUnreadCount, selectLastSyncTs return correct data.  
   c. Actions setUnreadNotificationCount, setLastSyncTimestamp update store & persist via redux-persist.  

2. Dependencies  
   – Existing networkSlice.ts, PersistGateProvider, SQLite transform.  

3. Implementation Approach  
   1. Extend interface NetworkState in src/store/slices/networkSlice.ts.  
   2. Add reducers & actions.  
   3. Wire selectors in same file (export).  
   4. Add migration step in sqliteTransform (if versioned) to hydrate new keys.  

4. New Code Artifacts  
   • src/store/slices/networkSlice.ts  (updated)  
     – addReducer setUnreadNotificationCount(state, action:PayloadAction<number>)  
     – addReducer setLastSyncTimestamp(state, action:PayloadAction<string>)  
     – export const selectUnreadCount, selectLastSyncTs.  

5. Expected Outputs  
   – Redux state extended and persisted; no build break.  

6. Testing Requirements  
   • __tests__/store/slices/networkSlice.test.ts  
     – reducer default values, action updates, selector returns.  
   – Coverage ≥ 90 % for slice file.  
   – jest-axe check to confirm added state is exposed via accessible UI labels where rendered.  

7. Additional Specifications  
   • lastSyncTs stores ISO-8601 string (UTC).  
------------------------------------------------------------

SUB-TASK 2  – NOTIFICATIONS-API-&-SYNC  
Story Points: 3  
Component(s): CPAPP-SYNC, CPAPP-API  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. GET /api/v1/notifications?unreadOnly=true returns array; SyncManager stores count in Redux via setUnreadNotificationCount.  
   b. Network call uses same retry & JWT rules as existing fetchWithRetry.  
   c. When manualSync/fullSync completes successfully, lastSyncTs updated.  

2. Dependencies  
   – Completion of SUB-TASK 1 (actions).  
   – API endpoint EP-BCKND-NOTIF-001.  

3. Implementation Approach  
   1. Create RTK Query slice notificationsApi in src/store/api/notificationsApi.ts (baseQuery = customBaseQuery, tagTypes ['Notifications']).  
   2. Add hook useGetUnreadNotificationsQuery({unreadOnly:true}).  
   3. Extend SyncManager.manualSync():  
      • call fetchWithRetry('/api/v1/notifications?unreadOnly=true', 'notifications')  
      • dispatch(setUnreadNotificationCount(payload.data.length))  
      • after all entities persisted, dispatch(setLastSyncTimestamp(new Date().toISOString())).  
   4. Update hydrateReduxSlices to accept unreadCount.  

4. New Code Artifacts  
   • src/store/api/notificationsApi.ts  
   • SyncManager.ts – methods: private async fetchUnreadCount():number, integrate call.  

5. Expected Outputs  
   – Unread badge value available in store after any sync.  
   – lastSyncTs always reflects timestamp of most recent successful sync.  

6. Testing Requirements  
   • Unit: src/__tests__/store/api/notificationsApi.test.ts (mock server).  
   • Integration: __tests__/integration/SyncUnreadCount.integration.test.ts (mock fetch, expect store update).  
   • Accessibility: jest-axe rule—badge must have aria-label describing unread count.  

7. Additional Specifications  
   • No local caching of individual notifications yet (future story).  
------------------------------------------------------------

SUB-TASK 3  – SYNC-SCHEDULER & THROTTLE  
Story Points: 4  
Component(s): CPAPP-SYNC  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. Foreground auto-sync fires every 180 ± 10 s (configurable constant).  
   b. On background (AppState !== 'active'), scheduler paused.  
   c. No sync of any kind (auto or manual) executes if < 30 s since the **previous successful sync**; Toast “Please wait before refreshing” shown for manual attempts.  
   d. SyncManager prevents concurrent sync executions using an internal mutex/semaphore.  

2. Dependencies  
   – SUB-TASK 2 (manualSync updates store).  
   – Existing SyncScheduler.ts & AppStateManager.ts.  

3. Implementation Approach  
   1. constants/sync.ts → export AUTO_SYNC_INTERVAL_MS = 180_000, MIN_SYNC_GAP_MS = 30_000.  
   2. Refactor SyncScheduler.start(): setInterval in foreground, clear on background/offline.  
   3. Maintain static lastSyncAt:number | null in SyncManager (single source of truth).  
   4. Add helper canTriggerSync(source: 'auto' | 'manual' | 'longPress'): boolean that checks MIN_SYNC_GAP_MS against lastSyncAt.  
   5. SyncManager.manualSync(source) and auto triggers both call canTriggerSync; if false and source === 'manual', show Toast; if source === 'auto', silently skip.  
   6. Preserve existing “long-press = full delta pull” behaviour **but** route through canTriggerSync so the 30 s guard is never bypassed.  

4. New Code Artifacts  
   • src/constants/sync.ts (update).  
   • src/sync/SyncScheduler.ts – add scheduleAutoSync(), stopAutoSync().  
   • src/sync/SyncManager.ts – add static lastSyncAt, canTriggerSync(), updated manualSync logic; include mutex (e.g., with p-queue or internal Promise lock).  

5. Expected Outputs  
   – Logs show scheduler ticks; manual & auto throttles enforced; no overlapping sync tasks.  

6. Testing Requirements  
   • Jest fake-timers in __tests__/sync/SyncScheduler.test.ts (advanceTimersByTime).  
   • Throttle test __tests__/sync/SyncThrottle.test.ts to cover auto-then-manual and manual-then-auto within 30 s.  
   • Performance regression: ensure memory < 5 MB per sync; verify using existing SyncSchedulerPerformance.test.ts.  

7. Additional Specifications  
   • Use NetInfo to skip auto-sync when offline.  
   • Mutex implementation must resolve pending promise if cancelled to avoid deadlocks.  
------------------------------------------------------------

SUB-TASK 4  – TOPBAR COMPONENT  
Story Points: 3  
Component(s): CPAPP-UI  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. TopBar appears on Home, My Leads, Quotation, Customers stacks.  
   b. Contains:  
      – Sync button (↻) with grey disabled state during sync/offline.  
      – Notifications icon (🔔) with red badge showing unreadNotificationCount (> 0).  
      – Profile icon (👤) placeholder.  
   c. Tap Sync → manualSync subject to throttle; **long-press triggers a full-delta sync but still respects the 30 s minimum gap.**  
   d. Tap Notification icon navigates to (stub) NotificationsScreen (opens blank list).  

2. Dependencies  
   – SUB-TASK 1 (selector), SUB-TASK 3 (manualSync).  

3. Implementation Approach  
   1. Create reusable component TopBar.tsx in src/components/common.  
   2. Use react-native-paper Appbar + Badge.  
   3. Connect with hooks: useConnectivity(), useAppSelector(selectUnreadCount, selectSyncInProgress).  
   4. onPress ↻ → SyncManager.manualSync('manual'); onLongPress ↻ → SyncManager.manualSync('longPress').  
   5. Navigation: create NavigationRef helper navigateToNotifications().  

4. New Code Artifacts  
   • src/components/common/TopBar.tsx  
   • src/navigation/NotificationsStack.tsx (stub screen).  
   • New helper in navigation/navigationRef.ts: navigateToNotifications().  

   Function Signatures:  
   – TopBarProps { showSync?: boolean } → JSX.Element  
   – SyncManager.manualSync(source: 'manual' | 'longPress'): Promise<SyncResult>  

5. Expected Outputs  
   – UI renders according to state; accessibility labels set.  

6. Testing Requirements  
   • RTL tests: __tests__/components/TopBar.test.tsx – badge rendering, disabled states, long-press behaviour.  
   • jest-axe accessibility assertions for buttons and badge.  
   • Detox path update to open Notifications (extend e2e).  

7. Additional Specifications  
   • Accessibility: Sync button label “Synchronise data”; badge described via accessibilityHint.  
------------------------------------------------------------

SUB-TASK 5  – DASHBOARD UI UPDATES  
Story Points: 2  
Component(s): CPAPP-UI  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. HomeScreen shows text “Last sync: <relative time>” below KPI widgets, updating on every store change.  
   b. OfflineBanner stays visible at top when NetInfo reports no connectivity.  
   c. KPI tiles display cached numbers when offline.  

2. Dependencies  
   – SUB-TASK 1 & SUB-TASK 3 (lastSyncTs).  

3. Implementation Approach  
   1. Import selectLastSyncTs in HomeScreen.  
   2. Add util formatRelativeTime(ts):string in src/utils/date.ts.  
   3. Place component between KPI row and FAB.  
   4. Ensure HomeScreen subscribes only to shallow-equal props to avoid re-render flood.  

4. New Code Artifacts  
   • src/utils/date.ts – export formatRelativeTime(iso:string):string.  

5. Expected Outputs  
   – “Last sync: 2 min ago” visible; no flicker.  

6. Testing Requirements  
   • RTL snapshot update HomeScreen.test.tsx.  
   • jest-axe check for “Last sync” text readability.  
   • Performance test (existing DashboardPerformance) extended to assert no extra renders.  

7. Additional Specifications  
   • When never synced display “Last sync: –”.  
------------------------------------------------------------

SUB-TASK 6  – TEST HARNESS & COVERAGE  
Story Points: 3  
Component(s): CPAPP-TEST  
------------------------------------------------------------  
1. Acceptance Criteria  
   a. All new code ≥ 85 % coverage; global ≥ 80 %.  
   b. Integration tests cover scheduler tick and throttle edge cases.  
   c. Detox e2e “dashboard-flow” passes on Android & iOS.  
   d. Accessibility regression suite (jest-axe) passes for TopBar and HomeScreen.  

2. Dependencies  
   – Completion of SUB-TASK 1-5.  

3. Implementation Approach  
   1. Add Jest suites listed in previous sub-tasks including a11y assertions.  
   2. Extend existing SyncSystemIntegration.test.ts to assert unreadCount & lastSyncTs hydration and throttle across auto/manual.  
   3. Add new Detox script e2e/dashboardRefresh.e2e.ts:  
      – launch, wait 3 min, check KPI updated.  
      – tap Sync twice inside 30 s, expect Toast.  
      – verify long-press after 30 s performs full-delta sync.  

4. New Code Artifacts  
   • __tests__/integration/dashboardSync.integration.test.ts  
   • __tests__/a11y/TopBar.a11y.test.tsx  
   • e2e/dashboardRefresh.e2e.ts  

5. Expected Outputs  
   – CI pipeline green; coverage badges updated by scripts/generate-badges.js.  

6. Testing Requirements  
   • SonarQube gate passes; jest-axe rule set “critical” for violations.  
------------------------------------------------------------

OVERALL DELIVERABLES  
• Updated Redux slice, SyncManager, SyncScheduler, RTK Query slice.  
• Reusable TopBar component & Navigation plumbing.  
• Enhanced HomeScreen UI with last-sync timestamp & offline handling.  
• Unified sync throttling across auto & manual triggers with concurrency guard.  
• Unit, integration, accessibility and e2e tests; coverage badges refreshed.  

PERFORMANCE & SECURITY NOTES  
• No additional memory allocations ≥ 5 MB; selectors use shallowEqual.  
• SyncManager still respects JWT expiry & auto-logout.  
• Badge/lastSync data are non-PII; no encryption required.  

DEPLOYMENT  
• Mobile CI workflow already recompiles on push; no backend changes.  
• Ensure .env* templates include any new configurable constants (none mandatory).  

END OF BACKLOG