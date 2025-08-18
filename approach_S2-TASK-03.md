Implementation Backlog – S2-TASK-03  
Feature: Foreground Sync Scheduler & Dashboard Feed  
Components touched:  
• CPAPP-SYNC (timer wrapper, SyncManager orchestration)  
• CPAPP-STATE (new Redux slice for sync/dashboard)  
• CPAPP-UI (pull-to-refresh on Home/Dashboard screen)

====================================================================
Epic  ❖  S2-TASK-03 Foreground Sync Scheduler & Dashboard Feed
====================================================================
Business goal: keep lead/customer data and dashboard KPIs fresh while the user keeps the app open, with a 180 s automatic foreground cycle and a manual pull-to-refresh that respects a 30 s throttle.

--------------------------------------------------------------------
Sub-Task 1  (3 story points) – Create networkSlice (sync status & dashboard data)
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. Redux slice exposes state  
      ```ts
      {
        syncInProgress: boolean;
        lastSyncAt: number | null;
        nextAllowedSyncAt: number;   // derived guard timestamp
        dashboardSummary: DashboardSummary | null;
        lastError: string | null;
      }
      ```  
   b. Reducers: setSyncStarted, setSyncFinished(timestamp), setSyncFailed(error), setDashboardSummary(payload), setNextAllowedSyncAt(timestamp).  
   c. Initial state matches types and is included in rootReducer but explicitly NOT persisted to AsyncStorage (persistConfig blacklist).  
   d. Unit tests reach ≥ 90 % branch coverage.

2. Dependencies  
   • None (stand-alone slice creation).  
   • Must align with existing RootState combiners in src/store/index.ts.

3. Implementation Approach (WHAT)  
   1. Define type `DashboardSummary` in `src/store/types.ts`.  
   2. Add new slice file `src/store/slices/networkSlice.ts` with `createSlice()`.  
   3. Register slice in `rootReducer`; update `persistConfig` blacklist to include `"network"`.  
   4. Export selectors `selectSyncInProgress`, `selectDashboardSummary`, `selectNextAllowedSyncAt`.  

4. New Code Artifacts  
   • `src/store/slices/networkSlice.ts` – Redux slice definition  
   • `src/store/types.ts` – interface `DashboardSummary { totalLeads:number; leadsWon:number; customerAccepted:number; … }`  
   • Tests → `__tests__/store/slices/networkSlice.test.ts`  

5. Expected Outputs  
   • New slice visible in Redux dev-tools; Jest tests green.

6. Testing Requirements  
   • Jest unit tests for each reducer and selector.  
   • Verify `networkSlice` NOT persisted (redux-persist configuration test).  
   • Sonar gate ≥ 80 % overall (slice is pure functions – should reach > 95 %).

7. Additional Specs  
   • Follow existing camelCase naming convention for actions.  
   • Reducer `setNextAllowedSyncAt` stores the guard timestamp provided by scheduler/pull logic.

--------------------------------------------------------------------
Sub-Task 2  (4 story points) – Foreground SyncScheduler service
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. Scheduler starts after successful login and when `AppState === "active"`.  
   b. Fires `SyncManager.manualSync()` + `fetchDashboardSummary()` every 180 ± 10 s.  
   c. Respects guard: no execution if `Date.now() < nextAllowedSyncAt` (30 s rule).  
   d. Stops on logout OR when `AppState` moves to `background`/`inactive`.  
   e. Emits events `"schedStarted"` & `"schedStopped"` (TinyEmitter) for future diagnostics.

2. Dependencies  
   • Sub-Task 1 (networkSlice actions)  
   • Existing `SyncManager.manualSync()`  
   • `react-native-background-timer` dependency to be added.

3. Implementation Approach  
   0. Add constants file `src/constants/sync.ts` exporting  
      ```ts
      export const SYNC_INTERVAL_MS = 180_000;   // 180 s
      export const SYNC_GUARD_MS    =  30_000;   // 30 s
      export const SYNC_DRIFT_MS    =  10_000;   // tolerance
      ```  
      Reference these constants everywhere instead of hard-coding values.  
   1. Add npm dependency `react-native-background-timer@3.6.x`; run `npx pod-install` on iOS.  
   2. Create singleton class `SyncScheduler` in `src/sync/SyncScheduler.ts`.  
   3. Internally use `BackgroundTimer.setInterval(SYNC_INTERVAL_MS)`; clear with `BackgroundTimer.clearInterval`.  
   4. On each tick:  
      • Dispatch `networkSlice.setSyncStarted()`.  
      • `await SyncManager.manualSync()`.  
      • Call `dashboardApi.endpoints.getSummary.initiate()` (Sub-Task 3).  
      • On success, dispatch `setDashboardSummary` and calculate `nextAllowedSyncAt = Date.now() + SYNC_GUARD_MS` via `setNextAllowedSyncAt`.  
      • Dispatch `setSyncFinished(Date.now())`.  
      • On failure dispatch `setSyncFailed(error.message)` and still update guard timestamp.  
   5. Maintain an internal `isRunning` flag and return early in `start()` if already active.  
   6. Listen to `AppState` changes; pause/resume accordingly without creating duplicate intervals.  
   7. Use `tiny-emitter` for `"schedStarted"` / `"schedStopped"` events.

4. New Code Artifacts  
   • `src/constants/sync.ts` – interval & guard constants  
   • `src/sync/SyncScheduler.ts` – singleton service  
     – public methods:  
       ```ts
       getInstance(): SyncScheduler  
       start(store: Store): void  
       stop(): void  
       ```  
   • `__tests__/sync/SyncScheduler.test.ts` – Jest fake-timer tests

5. Expected Outputs  
   • Timer visible in debugger; skips execution when guard not satisfied.  
   • Logs show `"schedStarted"` on login and `"schedStopped"` on logout/ background.

6. Testing Requirements  
   • Jest with `jest.useFakeTimers()` validates 180 s interval and guard logic.  
   • Verify `stop()` clears interval and removes listeners (memory leak test).  
   • Simulate 20 min run to ensure no drift > SYNC_DRIFT_MS.

7. Additional Specs  
   • Scheduling occurs only while app is foregrounded; `Stop()` is **mandatory** on logout to avoid orphaned intervals.  
   • All numeric values imported from `src/constants/sync.ts` for single-point tuning.

--------------------------------------------------------------------
Sub-Task 3  (3 story points) – Dashboard summary API integration
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. RTK Query endpoint `GET /api/v1/leads/summary` returns `DashboardSummary`.  
   b. Hook `useGetDashboardSummaryQuery` available to UI & scheduler.  
   c. Successful fetch updates store via `onQueryStarted` → dispatch `setDashboardSummary`.  
   d. 401/5xx errors reuse existing `errorMiddleware` flow (no unhandled promise rejection).

2. Dependencies  
   • Sub-Task 1 slice file must be merged (for dispatch).  
   • Base RTK `baseApi` already configured.

3. Implementation Approach  
   1. In `src/store/api/index.ts` extend `baseApi.addEndpoints` with key `getSummary`.  
   2. Provide `transformResponse` to coerce payload to `DashboardSummary`.  
   3. Inside `onQueryStarted`, wait for `queryFulfilled` then dispatch `networkSlice.setDashboardSummary`.  
   4. Export generated hook `useGetDashboardSummaryQuery`.

4. New Code Artifacts  
   • Modification of `src/store/api/index.ts` (or new `dashboardApi.ts` if logical separation preferred).  
   • Tests → `__tests__/store/api/dashboardApi.test.ts`

5. Expected Outputs  
   • Swagger/mock-server contract verified; hook returns data/errors as expected.

6. Testing Requirements  
   • Mock server returns 200 + sample payload.  
   • 401 path triggers `performLogout` (reuse existing middleware).  
   • Sonar targets maintained.

7. Additional Specs  
   • `keepUnusedDataFor: 0` to force fresh fetch each call.  
   • Endpoint tag: `"Dashboard"` for cache invalidation if needed later.

--------------------------------------------------------------------
Sub-Task 4  (3 story points) – Integrate SyncScheduler lifecycle into App bootstrap
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. Scheduler starts once user is authenticated and root component mounted.  
   b. Scheduler stops on `performLogout` thunk completion or when `<App/>` unmounts (e.g., Fast Refresh).  
   c. No duplicate schedulers after multiple logins/hot reloads.

2. Dependencies  
   • Sub-Task 2 `SyncScheduler`  
   • Existing `AuthBootstrap` & `performLogout` thunk.

3. Implementation Approach  
   1. In `src/components/common/AuthBootstrap.tsx`, import `SyncScheduler`.  
   2. Inside effect that observes `authSlice.authenticated === true`, call `SyncScheduler.getInstance().start(store)`.  
   3. Add cleanup in same effect to `stop()` on unmount or when auth state changes to logged-out.  
   4. Amend `performLogout` thunk: after clearing DB key, invoke `SyncScheduler.getInstance().stop()`.

4. New Code Artifacts  
   • No new files – modifications only.  
   • Tests → `__tests__/integration/schedulerLifecycle.integration.test.ts`

5. Expected Outputs  
   • Redux logs show scheduler start on login, stop on logout; hot-reload does not duplicate intervals.

6. Testing Requirements  
   • Jest mocking store + auth state transitions verifies start/stop.  
   • Memory-leak check: `global.setInterval` count returns to 0 after logout.

7. Additional Specs  
   • Ensure idempotent `stop()` – safe to call even if not started (defensive coding).

--------------------------------------------------------------------
Sub-Task 5  (2 story points) – Pull-to-Refresh Hook & UI wiring
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. `HomeScreen` supports pull gesture; while syncing shows `RefreshControl` spinner.  
   b. Manual pull triggers `SyncManager.manualSync()` + dashboard summary fetch.  
   c. Guard: if `Date.now() < nextAllowedSyncAt`, show toast “Please wait a moment…” and exit without API hit.

2. Dependencies  
   • Sub-Task 1 selectors (`selectNextAllowedSyncAt`).  
   • Existing `HomeScreen` UI.

3. Implementation Approach  
   1. Create hook `useDashboardRefresh()` in `src/hooks/useDashboardRefresh.ts`.  
      – Returns `{ refreshing:boolean, onRefresh:()=>void }`.  
      – Uses redux selectors & dispatches networkSlice actions.  
   2. In `HomeScreen.tsx` wrap top `ScrollView`/`FlatList` with `<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />`.  
   3. Toast: use existing `Toast` util to display guard message.

4. New Code Artifacts  
   • `src/hooks/useDashboardRefresh.ts`  
   • Tests → `__tests__/hooks/useDashboardRefresh.test.ts`  
   • Snapshot update: HomeScreen UI with `RefreshControl`

5. Expected Outputs  
   • Manual pull works and respects guard; spinner disappears after sync.

6. Testing Requirements  
   • RTL test simulating pull; `jest.advanceTimersByTime` for guard path.  
   • Integration with `SyncManager` mocked to resolve quickly.

7. Additional Specs  
   • Hook should read constants from `src/constants/sync.ts` to ensure guard consistency.

--------------------------------------------------------------------
Sub-Task 6  (2 story points) – Quality Gates & Documentation
--------------------------------------------------------------------
1. Acceptance Criteria  
   a. End-to-end test “dashboard stays fresh” passes: scheduler fires ≥ 3 times in 10 min Detox run.  
   b. Overall Jest coverage ≥ 80 %, business logic ≥ 85 %.  
   c. ADR-0006 updated with scheduler rationale; new ADR-0007-sync-scheduler.md added.  
   d. CHANGELOG entry under “Sprint 2 – TASK-03”.  
   e. CI scripts updated to include new slice, constants file, and tests.

2. Dependencies  
   • All previous sub-tasks merged.

3. Implementation Approach  
   1. Add new Detox test at `e2e/dashboardAutoSync.e2e.ts`.  
   2. Update `jest.config.js` if additional coveragePathIgnorePatterns needed.  
   3. Write `docs/adr/ADR-0007-sync-scheduler.md` capturing trade-offs: foreground only, single timer, constants config.  
   4. Update `scripts/test-coverage-comprehensive.sh` to include `src/constants`, `src/hooks`, `src/sync`.

4. New Code Artifacts  
   • `e2e/dashboardAutoSync.e2e.ts`  
   • `docs/adr/ADR-0007-sync-scheduler.md`

5. Expected Outputs  
   • CI pipeline green; coverage badge regenerated.

6. Testing Requirements  
   • Detox: mock server + accelerate timers with `BackgroundTimer.setTimeout` override to keep run < 3 min real time.  
   • SonarQube passes thresholds.

--------------------------------------------------------------------
Cross-Cutting Additional Specifications
--------------------------------------------------------------------
• Error Handling: `SyncScheduler` wraps each run in try/catch; on failure dispatches `setSyncFailed` and still enforces guard.  
• Performance: Scheduler business logic must finish < 200 ms for typical payload (1000 leads).  
• Security: JWT header injection via existing `baseApi`; new code stores no secrets.  
• Configuration: interval (180 s) & guard (30 s) constants defined once in `src/constants/sync.ts` for A/B tuning.  
• Linting: Follow existing ESLint rules; add new files to lint-staged pattern.  
• CI: `mobile-ci.yml` – ensure `yarn type-check` step covers new files; update cache keys if dependencies added.  

====================================================================
Deliverables Summary
====================================================================
1. New Redux slice (`networkSlice`) with selectors, tests, and persist blacklist  
2. `SyncScheduler` singleton service with timer, guard, AppState awareness, and tests  
3. RTK Query endpoint `GET /leads/summary` and store wiring  
4. Lifecycle hooks in `AuthBootstrap` + logout cleanup  
5. Pull-to-refresh hook & UI integration on `HomeScreen`  
6. Constants file for sync intervals/guards, referenced by all modules  
7. E2E test, ADR-0007, CHANGELOG, CI script updates  
8. All new code ≥ 80 % coverage, passes ESLint/Prettier, no memory leaks in 20 min profiling run