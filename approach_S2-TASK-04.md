Implementation Backlog – S2-TASK-04 “Offline UX Components (Banner & Pull-to-Refresh)”

────────────────────────────────────────────────────────
EPIC / Parent Task
────────────────────────────────────────────────────────
ID: S2-TASK-04  
Title: Offline UX Components (Banner & Pull-to-Refresh)  
Components Affected: CPAPP-UI, CPAPP-SYNC, CPAPP-STATE  
Business Value: Give CPs instant feedback about connectivity and a reliable manual refresh path.  
Story-Point Budget: ≤ 16 (sprint “small”)

────────────────────────────────────────────────────────
Sub-Tasks  (all 2-4 SP, INVEST compliant)
────────────────────────────────────────────────────────

SUB-TASK 1 – “OfflineBanner polish & test suite” (2 SP)  
1. Acceptance Criteria  
   a. Banner appears ≤ 1 s after NetInfo reports offline.  
   b. Banner slides in/out with 500 ms animation and no layout shift.  
   c. Accessibility: role=alert, liveRegion=assertive, message announced via screen-reader.  
   d. RTL test verifies text + animation trigger; Jest snapshot stable.  
2. Dependencies: current OfflineBanner.tsx, ConnectivityContext; no new deps.  
3. Implementation Approach  
   – Confirm banner listens only to context value; add debounce(500 ms) guard to avoid flicker.  
   – Export default constant HEIGHT = 32 dp for layout reuse (named export `OFFLINE_BANNER_HEIGHT`).  
   – Ensure banner z-index > MainTab bar (no obstruction).  
   – Add unit tests (use NetInfo mock).  
4. New Code Artifacts  
   • src/components/common/OfflineBanner.tsx – minor enhancement (debounce, export height).  
   • __tests__/components/common/OfflineBanner.test.tsx – RTL + jest-axe accessibility tests.  
5. Expected Outputs: Green tests, coverage ≥ 90 % for component.  
6. Testing Requirements  
   – Use jest.useFakeTimers() / advanceTimersByTime.  
   – axe-core accessibility assertion.  
7. Additional Specs: None.

──────────────────

SUB-TASK 2 – “Generic PullToRefreshControl component” (3 SP)  
1. Acceptance Criteria  
   a. Wrapper exposes `{ refreshing, onRefresh }` suitable for ScrollView/FlatList.  
   b. onRefresh triggers `SyncManager.manualSync('pullToRefresh')`.  
   c. While `syncInProgress` flag in `networkSlice` is true, `refreshing` prop stays true.  
   d. Respects `SYNC_GUARD_MS`: if now < `nextAllowedSyncAt`, show Toast “Please wait …” and do not trigger sync.  
2. Dependencies: SyncManager, Toast util, networkSlice selectors/actions.  
3. Implementation Approach  
   – Create presentational component + internal hook; share guard helper from constants/sync.ts.  
   – Dispatch `setSyncStarted` / `setSyncFinished` / `setSyncFailed` around manualSync promise for UI consistency.  
   – Tint colours follow `theme.colors.primary`; announce “Refreshing data” via AccessibilityInfo.  
4. New Code Artifacts  
   • src/components/common/PullToRefreshControl.tsx – React.memo component exporting RefreshControl wrapper.  
   • src/hooks/usePullToRefresh.ts – returns `{ refreshing, onRefresh }`.  
   • __tests__/hooks/usePullToRefresh.test.tsx – mocks SyncManager, verifies guard logic & dispatches.  
5. Expected Outputs: Reusable component consumed by any list/scroll view.  
6. Testing Requirements  
   – Mock store with redux-mock-store; assert actions.  
   – Mock SyncManager to promise-resolve after 300 ms.  
7. Additional Specs  
   – Use `AccessibilityInfo.announceForAccessibility('Refreshing data')` on trigger.  

──────────────────

SUB-TASK 3 – “useDashboardRefresh hook (implementation)” (3 SP)  
1. Acceptance Criteria  
   a. Returns `{ refreshing, onRefresh, lastSyncAt, nextAllowedSyncAt }`.  
   b. Utilises same guard logic as PullToRefresh (central util).  
   c. On successful sync, triggers `dashboardApi.util.invalidateTags(['DashboardSummary'])` for fresh data.  
2. Dependencies: dashboardApi, networkSlice, SyncManager, helper in constants/sync.ts.  
3. Implementation Approach  
   – Extract helper `isSyncAllowed(now, nextAllowedSyncAt): boolean` to constants/sync.ts.  
   – Re-export hook from `src/hooks/index.ts` for future consumption.  
4. New Code Artifacts  
   • src/hooks/useDashboardRefresh.ts – implementation + JSDoc.  
   • __tests__/hooks/useDashboardRefresh.test.ts – fake timers + mocked RTK Query.  
5. Expected Outputs: Hook consumed by HomeScreen.  
6. Testing: mock store & RTK Query; verify invalidateTags called.  
7. Additional Specs: None.

──────────────────

SUB-TASK 4 – “MyLeadsScreen (list + refresh + banner)” (3 SP)  
1. Acceptance Criteria  
   a. Screen renders FlatList of leads from `selectLeads` selector.  
   b. Pull-to-refresh wired to PullToRefreshControl; spinner bound to sync flag.  
   c. OfflineBanner visible at top (respects SafeArea inset).  
   d. Empty-state component when no leads.  
2. Dependencies: leadSlice, PullToRefreshControl, OfflineBanner, Navigation (HomeStack).  
3. Implementation Approach  
   – Create screen file; import into HomeStack after Dashboard.  
   – Each lead row simple (lead id, customer name, status) via separate presentational component.  
4. New Code Artifacts  
   • src/screens/leads/MyLeadsScreen.tsx – main list screen.  
   • src/screens/leads/LeadListItem.tsx – memoised row component.  
   • __tests__/screens/MyLeadsScreen.test.tsx – RTL list & refresh tests.  
5. Expected Outputs: Screen navigable; UI parity with design placeholder.  
6. Testing Requirements  
   – Mock Redux store with 3 leads.  
   – Simulate `fireEvent(refreshControl,'refresh')` and assert SyncManager call.  
7. Additional Specs  
   – Future: navigation to LeadDetail; keep component generic.

──────────────────

SUB-TASK 5 – “Integrate components into Dashboard (HomeScreen)” (3 SP)  
1. Acceptance Criteria  
   a. HomeScreen wrapped in PullToRefreshControl; onRefresh triggers sync.  
   b. OfflineBanner rendered (fixed top) and does not cover status bar.  
   c. Existing stats/quick-actions remain functional.  
2. Dependencies: Sub-Tasks 1–3.  
3. Implementation Approach  
   – Replace `ScreenContainer scrollable` with PullToRefreshControl + inner ScrollView.  
   – Adjust banner style to account for exported `OFFLINE_BANNER_HEIGHT`.  
4. New Code Artifacts  
   • (edits only) src/screens/home/HomeScreen.tsx – wrapper integration.  
   • __tests__/screens/HomeScreenRefresh.test.tsx – asserts refresh handler wired.  
5. Expected Outputs: Manual refresh works, confirmed via logs.  
6. Testing Requirements  
   – Mock SyncManager & NetInfo; snapshot unchanged for content.  
7. Additional Specs: N/A.

──────────────────

SUB-TASK 6 – “Comprehensive Test & CI updates” (2 SP)  
1. Acceptance Criteria  
   a. All new tests pass; overall coverage remains ≥ 80 %.  
   b. New Jest suites picked up by jest.config.js automatically.  
   c. ESLint & Prettier clean; markdown updated.  
2. Dependencies: completion of Sub-Tasks 1-5.  
3. Implementation Approach  
   – Add badge update entry to scripts/generate-badges.js for offline-UX coverage.  
   – Update CHANGELOG.md and docs/adr/ADR-0007-sync-scheduler.md (“manual refresh” section).  
4. New Code Artifacts  
   • __tests__/integration/offlineUX.integration.test.ts – happy-path end-to-end with mocked NetInfo & SyncManager.  
5. Expected Outputs: Green CI pipeline.  
6. Testing Requirements  
   – CI run `yarn test` + `yarn coverage:badge` verifies thresholds.  
7. Additional Specs: None.

────────────────────────────────────────────────────────
Cross-task Technical Notes & Specifications
────────────────────────────────────────────────────────
• State updates: Pull/Refresh must dispatch `networkSlice.setSyncStarted / setSyncFinished / setSyncFailed` to maintain single source of truth for `refreshing`.  
• Guard Logic: helper `isSyncAllowed(now,nextAllowedSyncAt)` lives in constants/sync.ts.  
• Theming: PullToRefreshControl uses `theme.colors.primary` for tint / progress-background.  
• Performance: Use React.memo on PullToRefreshControl and LeadListItem to avoid unnecessary re-renders.  
• Security: No token exposure in logs; SyncManager already strips token.  
• Error Handling: Show Toast on sync failure (reuse errorMiddleware toast util).  
• Accessibility:  
  – OfflineBanner: screen-reader announcement (role alert, assertive).  
  – Pull-to-refresh: announces “Refreshing data”.  
• Deployment: No native code, so Fastlane & CI remain unchanged.  
• Documentation: Update README offline UX screenshot; ADR addendum recorded.

────────────────────────────────────────────────────────
Dependency Graph / Execution Order
────────────────────────────────────────────────────────
1️⃣ Sub-Task 1  
2️⃣ Sub-Task 2 ➜ 3️⃣ Sub-Task 3  
4️⃣ Sub-Task 4 (needs 1,2)  
5️⃣ Sub-Task 5 (needs 1,2,3)  
6️⃣ Sub-Task 6 (after all preceding tasks)

Total Estimated Points: 16  ✅ within sprint budget

────────────────────────────────────────────────────────
End of Backlog
────────────────────────────────────────────────────────