IMPLEMENTATION BACKLOG  –  S3-TASK-03A  
My Leads Screen – Core List & Offline View  
Component Scope: CPAPP-LEAD, CPAPP-STATE, CPAPP-CACHE, CPAPP-UI

----------------------------------------------------------
EPIC GOAL
Deliver a production-ready “My Leads” screen that
• lists assigned leads with infinite (page-based) scroll  
• works fully offline in read-only mode (cached SQLite → Redux)  
• exposes a Pull-to-Refresh that triggers SyncManager.manualSync() **and hydrates Redux from the latest SQLite cache once sync completes**  
• shows a network-error and stale-data banner / graceful fallback  
• provides an “Add Lead” FloatingActionButton that is automatically disabled (and tooltip-guarded) when offline **or when the cached data is older than 24 h**.

----------------------------------------------------------
GLOBAL DEPENDENCIES
1. Lead foundation from Sprint-3 (leadSlice, leadApi, SQLite page cache).  
2. ConnectivityContext for online/offline detection.  
3. PullToRefreshControl, FloatingActionButton, SyncManager already present.  
4. L3-FRS-CPAPP, L3-LLD-CPAPP → functional + UX constraints.  
5. NFRS: 95 % ≤ 2-3 s response, 60 fps list scroll, FAB disabled offline, **24 h cache TTL enforcement**, basic WCAG-AA a11y.

----------------------------------------------------------
SUB-TASK BREAKDOWN  
(story-point estimates follow Fibonacci scale; all ≤ 4 pts)

┌─ ST-1: Pagination State & Selector Enhancements (3 pts)  
│  
├─ ST-2: Paginated API Hook Wrapper (usePaginatedLeads)  (2 pts)  
│   ↳ depends on ST-1  
│  
├─ ST-3: MyLeadsScreen UI Upgrade (core list, infinite scroll,  
│         empty / error / loading / stale-data states, baseline a11y)   (4 pts)  
│   ↳ depends on ST-1, ST-2  
│  
├─ ST-4: Offline- & TTL-Aware Add-Lead FAB Behaviour               (2 pts)  
│   ↳ depends on ConnectivityContext, ST-3 partial  
│  
├─ ST-5: Pull-to-Refresh → SyncManager integration & cache re-hydrate  (3 pts)  
│   ↳ depends on ST-3  
│  
└─ ST-6: Automated Testing, Coverage & Accessibility Audits          (3 pts)  
    ↳ depends on all prior sub-tasks  

----------------------------------------------------------
SUB-TASK DETAILS
───────────────────────────────────────────────────────────
ST-1  Pagination State & Selector Enhancements  (3 pts)
1. Acceptance Criteria  
   • leadSlice can store per-page loading flags and “hasMore” boolean.  
   • Selector selectPaginationMeta returns {pagesLoaded,totalPages,hasMore,loadingNext}.  
   • Unit tests cover happy & edge paths (≥ 90 % branch).

2. Dependencies: existing leadSlice.ts, leadSelectors.ts.

3. Implementation Approach  
   a. Extend LeadState: add loadingNext:boolean, hasMore:boolean.  
   b. Reducers: startNextPageLoad(), finishNextPageLoad({page,totalPages}).  
   c. ExtraReducers: hook to leadApi.getLeads.pending/fulfilled to toggle loadingNext + hasMore.  
   d. Update selectPaginationMeta in /store/selectors/leadSelectors.ts.

4. New Code Artifacts  
   • src/store/slices/leadSlice.ts → new actions & state fields.  
   • src/store/selectors/leadSelectors.ts → selectPaginationMeta update.  
   • Tests: __tests__/store/slices/leadSlicePaginationNext.test.ts.

5. Expected Outputs  
   Enhanced Redux state supports smooth infinite scroll.

6. Testing Requirements  
   • Jest unit tests for reducer logic & selector output.  
   • Sonar: ≥ 85 % on new slice logic.

7. Additional Specs  
   • Maintain backward compatibility; existing components must compile untouched.

───────────────────────────────────────────────────────────
ST-2  Paginated API Hook Wrapper  (usePaginatedLeads)  (2 pts)
1. Acceptance Criteria  
   • Hook returns {items, loadNext, refreshing, error, reload}.  
   • loadNext() is no-op if already loading or no more pages.  
   • When offline, loadNext() resolves instantly without API calls.  
   • 100 % TypeScript typed.

2. Dependencies: ST-1, leadApi.useGetLeadsQuery, ConnectivityContext.

3. Implementation Approach  
   a. Create custom hook that wraps RTK-Query & leadSlice pagination.  
   b. Internally calls useGetLeadsQuery({offset,limit}) based on next page index.  
   c. Emits effect when online state toggles → optional auto reload if cache empty.

4. New Code Artifacts  
   • src/hooks/usePaginatedLeads.ts  
     export interface UsePaginatedLeadsResult { … }  
     function usePaginatedLeads(pageSize = 25): UsePaginatedLeadsResult  

5. Expected Outputs  
   Reusable pagination abstraction for any future list screens.

6. Testing Requirements  
   • Unit tests with Jest & mocked store verifying pagination logic, offline short-circuit.

7. Additional Specs  
   • Must cleanly cancel in-flight queries on unmount via AbortController support in RTK-Query.

───────────────────────────────────────────────────────────
ST-3  MyLeadsScreen UI Upgrade  (4 pts)
1. Acceptance Criteria  
   • Displays first page < 1 s (mocked 20 items).  
   • Infinite scroll loads additional pages when onEndReached.  
   • Shows EmptyLeadsState when no data.  
   • Shows ActivityIndicator full-screen on first load.  
   • Shows in-content error banner if error && list empty.  
   • Shows **stale-data banner** when lastSync > 24 h and user is offline (read-only).  
   • Passes basic accessibility audit: FlatList items have accessible labels, Empty/Error/Stale banners have role="alert", FAB announces disabled state.  

2. Dependencies: ST-1, ST-2.

3. Implementation Approach  
   a. Refactor src/screens/leads/MyLeadsScreen.tsx  
      – Replace current manual useGetLeadsQuery with usePaginatedLeads hook.  
      – Implement onEndReached={()=>loadNext()} with threshold=0.4.  
      – Use getItemLayout + memoised LeadListItem for 60 fps.  
      – OfflineBanner already global; add subtle “(cached)” tag in subtitle when !isOnline.  
      – **Stale-data handling:** compute isStale = Date.now()-lastSyncAt > 24 h; render <StaleDataBanner/> component and set banner visible & high z-index.  
   b. For network error overlay, reuse Existing <ErrorBanner> pattern (if none, create minimal inline).  
   c. Persist scroll position across navigation via React Navigation’s screens.

4. New Code Artifacts / Updates  
   • Update MyLeadsScreen.tsx (major refactor).  
   • src/components/leads/StaleDataBanner.tsx – simple yellow banner component with accessibilityRole="alert".  

5. Expected Outputs  
   Scrolling list, no dropped frames, proper states, user warned when cache > 24 h.

6. Testing Requirements  
   • RN Testing Library component tests:  
     – renders 20 items  
     – triggers loadNext on scroll end  
     – offline mode: FAB disabled, “cached” text visible  
     – stale-data banner renders when lastSyncAt is old  
     – accessibility tree snapshot for FAB disabled & banners  
     – error state snapshot.  
   • Detox flow update: viewLeadsFlow.e2e covers infinite scroll & stale-data indication.

7. Additional Specs  
   • Use React.memo for LeadListItem; supply keyExtractor = lead.id.  
   • getItemLayout: constant height 140 (existing styles).  

───────────────────────────────────────────────────────────
ST-4  Offline- & TTL-Aware Add-Lead FAB Behaviour  (2 pts)
1. Acceptance Criteria  
   • FAB enabled only when **isOnline == true AND cacheAge ≤ 24 h**.  
   • While disabled, long-press shows tooltip “Connect to internet to add a lead”.  
   • onPress handler is guarded: if disabled, it is **no-op** (defensive in addition to UI state).  
   • Accessibility state reflects disabled status.  

2. Dependencies: ConnectivityContext, existing FloatingActionButton, ST-3 stale-data calculation.

3. Implementation Approach  
   a. In MyLeadsScreen, import useConnectivity() and lastSyncAt selector; derive isFabEnabled.  
   b. Pass disabled={!isFabEnabled} and tooltipMessage accordingly.  
   c. Wrap FAB onPress: if !isFabEnabled, return early (no navigation).  

4. New Code Artifacts  
   • No new files; MyLeadsScreen modification.  

5. Expected Outputs  
   UX faithful to L3-FRS-CPAPP §3.6 Off-line restrictions, plus TTL policy.

6. Testing Requirements  
   • Jest component test with mocked ConnectivityContext & lastSyncAt toggling verifies:  
     – enabled state online/fresh cache  
     – disabled state offline  
     – disabled state stale cache > 24 h  
     – onPress ignored when disabled.  

7. Additional Specs  
   • Keep FAB on all screens consistent; expose common prop defaultTooltip in FloatingActionButton if not present.

───────────────────────────────────────────────────────────
ST-5  Pull-to-Refresh → SyncManager integration & cache re-hydrate  (3 pts)
1. Acceptance Criteria  
   • Pull-to-Refresh invokes SyncManager.manualSync('manual').  
   • During sync, RefreshControl spinner visible.  
   • After success, **Redux leadSlice is refreshed from latest SQLite cache** (reuse preloadCacheData or equivalent) and list reflects new leads.  
   • If SyncManager throws, toast “Sync failed” + remains in old state.

2. Dependencies: ST-3 (list), existing SyncManager, PullToRefreshControl.

3. Implementation Approach  
   a. Create hook useLeadsRefresh() that wraps manualSync and then dispatches preloadCacheData() (or similar) to hydrate Redux from DB before setting refreshing=false.  
   b. Inside MyLeadsScreen pass PullToRefreshControl with onRefreshComplete.  
   c. Guard with mutex—if sync already running, ignore extra pulls.  

4. New Code Artifacts  
   • src/hooks/useLeadsRefresh.ts  
     – export interface UseLeadsRefreshResult {refreshing:boolean, onRefresh:()=>Promise<void>}  

5. Expected Outputs  
   Unified refresh behaviour across dashboard & leads; data integrity guaranteed.

6. Testing Requirements  
   • Jest mock SyncManager.manualSync success & failure.  
   • Verify Redux gets new leads after success (spy on upsertLeads).  
   • Integration test simulating pull-to-refresh updates UI counts.  
   • e2e: extend dashboardRefresh.e2e to include Leads list.

7. Additional Specs  
   • Must respect existing Sync throttle (30 s) – surface toast “Please wait X s” if blocked.

───────────────────────────────────────────────────────────
ST-6  Automated Testing, Coverage & Accessibility Audits  (3 pts)
1. Acceptance Criteria  
   • Unit + component + integration + e2e tests added; overall coverage still ≥ 80 % lines / ≥ 85 % business logic.  
   • **Accessibility tests (RTL + Jest-axe) validate FAB disabled state and banner roles/labels.**  
   • New tests green on CI (mobile-ci.yml & mobile-ci-detox.yml).  
   • SonarQube quality gate passes.

2. Dependencies: all previous sub-tasks.

3. Implementation Approach  
   a. Unit: reducers, hooks.  
   b. Component: MyLeadsScreen offline / online / stale snapshots.  
   c. Integration: SyncManager + Redux hydration.  
   d. E2E: update viewLeadsFlow.e2e (Detox) – scroll to bottom, verify next page loaded & stale banner visibility toggle after 24 h time-travel.  
   e. Add jest-axe accessibility assertions for FAB & banners.  
   f. Update jest.config & detox config if needed.

4. New Code Artifacts  
   • tests added under __tests__/… (see each sub-task).  
   • e2e/viewLeadsInfinite.e2e.ts (new file).

5. Expected Outputs  
   CI pipeline passes with new coverage & a11y badges regenerated.

6. Testing Requirements  
   • Ensure runtime perf: Detox test asserts < 2 s first render on mid-tier emulator.  
   • jest-axe threshold: no critical violations.

7. Additional Specs  
   • Update README badges via existing scripts after merge.

----------------------------------------------------------
PROJECT-LEVEL ACCEPTANCE (Definition of Done)
• All sub-task acceptance criteria met.  
• Lint, Type-check, Jest, Detox all green in CI.  
• Manual QA on physical Android & iOS devices: list load, offline toggle, stale-data banner, pull-to-refresh.  
• Documentation: ADR update not needed (behavioural), but add section to docs/L3-LLD-CPAPP.md “MyLeadsScreen pagination & TTL handling”.  
• No performance regression (use react-native-performance Monitor).  
• No new ESLint warnings.  
• Translations strings added where user-visible.  

----------------------------------------------------------
RISKS & MITIGATIONS
• Large datasets may exceed memory → use FlatList windowSize & removeClippedSubviews.  
• Server returns duplicate items → upsertLeads already idempotent.  
• Sync throttling conflicts with rapid pull-to-refresh → UX toast.  
• Offline banner overlaps FAB → ensure z-index ordering.  
• **Stale cache (> 24 h) could confuse users → prominent yet non-intrusive banner informs & guides sync.**  
• **Accessibility regressions → enforced by jest-axe CI gate.**

----------------------------------------------------------
ESTIMATED SPRINT LOAD
Total ≈ 17 story points (fits two-week sprint with buffer for bug-fix & review).

--------------------------------------------------------------------
