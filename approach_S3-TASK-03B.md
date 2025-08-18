Implementation Backlog  
Task ID S3-TASK-03B “My Leads Screen – Filters, Search, Over-Due Badge & Cache Invalidation”

Legend:  
SP = Story Points → 2 ≤ SP ≤ 4 (INVEST-compliant)

--------------------------------------------------------------------
SUB-TASK 1  (3 SP) “Redux Support – Search / Filter / Over-Due Count”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  leadSlice holds reactive searchText & filterState (status[], dateRange).  
  A2  New memo-selector selectFilteredLeads(state) returns leads respecting search & filters in ≤ 10 ms for ≤ 500 records.  
  A3  New selector selectOverdueCount(state) returns count where followUpDate < today & status ∉ terminal.  

2. Dependencies  
  • leadSlice.ts, leadSelectors.ts already exist.  
  • date utils in src/utils/date.ts.  

3. Implementation Approach  
  a. Extend LeadState with  
     searchText: string;  
     filters: { statuses: string[]; from?: string; to?: string };  
  b. Add reducers setSearchText, setFilters, clearFilters.  
  c. In leadSelectors.ts create:  
     selectFilteredLeads, selectOverdueCount (memoised via createSelector).  
     • selectFilteredLeads MUST rely on state.items (all cached leads).  
     • Do NOT include pagination logic here—UI layer handles paging after filtering.  
  d. Unit-benchmark selector speed with 1 000 mock leads using jest-perf hooks.  

4. New Artifacts  
  • src/store/slices/leadSlice.ts  – add reducers & initial fields.  
  • src/store/selectors/leadSelectors.ts  – new selectors.  
  • Function signatures  
    setSearchText(text: string): PayloadAction<string>  
    setFilters(f: Filters): PayloadAction<Filters>  
    selectOverdueCount(state: RootState): number  

5. Expected Outputs  
  Redux DevTools shows new fields; selectors return correct values & performance metrics logged (≤ 10 ms).  

6. Testing Requirements  
  • Jest unit tests (leadSlice.test.ts, leadSelectors.test.ts) for reducers & selector accuracy.  
  • Performance test ensures selector < 10 ms for 500-item dataset.  

7. Special Notes  
  Pure client-side logic – no API calls.  

--------------------------------------------------------------------
SUB-TASK 2  (3 SP) “SearchBar UI Component”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  SearchBar visible at top of MyLeadsScreen.  
  A2  Typing updates searchText in slice debounced ≤ 300 ms.  
  A3  Clear-icon empties search & resets list instantly.  
  A4  Visual style follows existing theme tokens (colors, shapes, spacing) and passes basic a11y checks (label, role=textbox, minimum 4.5:1 contrast).  

2. Dependencies  
  • Sub-task 1 (reducers exist).  
  • react-native-paper Searchbar component already installed.  

3. Implementation Approach  
  a. Create src/components/leads/SearchBar.tsx (wrapper around paper Searchbar).  
     • Use theme palette from ThemeProvider for colours/shapes.  
     • Dispatch setSearchText onChangeText (lodash.debounce 300 ms).  
  b. Connect MyLeadsScreen – render above FlatList.  
  c. Hide when scrolling down > 120 px (future enhancement; optional).  

4. New Artifacts  
  • SearchBar.tsx  
  • Update MyLeadsScreen.tsx (import & render).  

5. Expected Outputs  
  Filtered list updates as user types; stale-banner & FAB unaffected.

6. Testing  
  • RTL component test – typing filters list length.  
  • jest-axe a11y assertions for role & label.  
  • Accessibility label “Search leads”.  

--------------------------------------------------------------------
SUB-TASK 3  (3 SP) “FilterSheet – Status & Date Filters”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  CP taps “Filter” icon and sees modal bottom-sheet with multi-select status Chips and From/To date-pickers.  
  A2  ‘Apply’ commits setFilters; ‘Reset’ clears filters.  
  A3  Active filter count chip displayed next to icon.  
  A4  Sheet is fully accessible: focus trapped, escape/back closes, proper screen-reader labels, role=dialog.  
  A5  Component passes jest-axe with no critical violations.  

2. Dependencies  
  • Sub-task 1 reducers.  
  • react-native-paper Modal / Chip components.  

3. Implementation Approach  
  a. New component src/components/leads/FilterSheet.tsx.  
  b. Manage local sheet state → onApply dispatch setFilters.  
  c. Add “Filter” IconButton to MyLeadsScreen header (right side) with badge count.  
  d. Styling: reuse theme spacing/colour tokens for consistency with design system (Issue #1 resolution).  
  e. Provide accessibility helpers (focus trap, accessible dismiss button).  

4. New Artifacts  
  • FilterSheet.tsx  
  • Constants file src/constants/leadStatus.ts (export valid statuses for chips).  

5. Expected Outputs  
  Filtered list matches selected criteria; filter badge shows count.  

6. Testing  
  • RTL – select “In Discussion” & date-range → list length reduced.  
  • jest-axe a11y test (modal open & closed).  
  • Manual VO / TalkBack smoke test.  

--------------------------------------------------------------------
SUB-TASK 4  (3 SP) “MyLeadsScreen – List Binding to Filters/Search”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  MyLeadsScreen FlatList renders selectFilteredLeads output.  
  A2  When a search/filter is applied, MyLeadsScreen (if online) automatically triggers background page loads (loadNext) until no more pages remain or 500-lead cap reached, ensuring filter covers complete dataset.  
  A3  Pagination continues to work on the filtered dataset (local paging after filtering).  
  A4  Empty state now says “No leads match your filters”.  

2. Dependencies  
  • Sub-tasks 1–3 complete.  
  • usePaginatedLeads & leadSlice resetPagination already exist.  

3. Implementation Approach  
  a. Replace leads = selectPaginatedLeads with selectFilteredLeads.  
  b. On every change of searchText/filters:  
     • resetPagination();  
     • if (isOnline) iteratively call loadNext() until selectCanLoadMore === false OR fetched ≥ 500 items.  
  c. Keep previous infinite scroll logic for post-filter paging.  
  d. Modify EmptyLeadsState to accept custom message.  

4. New Artifacts  
  • MyLeadsScreen.tsx modifications only (no new files).  

5. Expected Outputs  
  Instant filter/search results across full cached dataset; scroll works; performance unchanged.

6. Testing  
  • RTL integration – apply search then scroll (ensure auto-fetch stops at max page).  
  • Jest performance check: first filter returns in ≤ 150 ms for 500 leads.

--------------------------------------------------------------------
SUB-TASK 5  (3 SP) “Over-Due Badge on Bottom Tab”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  Home tab (“HomeTab” route) shows numeric badge = selectOverdueCount when > 0.  
  A2  Badge refreshes within 3 s after SyncManager sync OR successful lead mutation.  
  A3  Badge disappears when count returns to 0.  

2. Dependencies  
  • Sub-task 1 (selector).  
  • Navigation: MainTabNavigator (currently has HomeTab & Settings).  

3. Implementation Approach  
  a. Create hook src/hooks/useOverdueBadge.ts – subscribes to selectOverdueCount & invokes navigation.setOptions({ tabBarBadge }).  
     • Throttle updates with requestAnimationFrame + leading debounce 300 ms to avoid render storm.  
  b. Use inside HomeStack root component (simplest) OR NavigationProvider (if easier to access navigation object).  
  c. Update MainTabNavigator.tsx – ensure initial badge value pulled from store during first render.  

4. New Artifacts  
  • useOverdueBadge.ts  
  • MainTabNavigator.tsx amendments.  

5. Expected Outputs  
  Badge reactive in UI without manual refresh; appears on Home icon.

6. Testing  
  • Jest hook test (renderHook & update mocked store).  
  • Detox e2e (see Sub-task 8) – validate badge increment after lead create.

--------------------------------------------------------------------
SUB-TASK 6  (3 SP) “RTK Query Tagging & Cache Invalidation”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  leadApi has createLead & updateLeadStatus mutations with invalidatesTags: ['Lead'].  
  A2  After successful mutation the list & badge update (no manual refresh).  
  A3  SyncManager.manualSync still reconciles to server data (no regression).  

2. Dependencies  
  • existing leadApi.getLeads query.  

3. Implementation Approach  
  a. In leadApi.ts add (if missing) tagTypes ['Lead'].  
  b. Implement mutations:  
     createLead → POST /api/v1/leads (schema per EP-BCKND-LEAD-002).  
     updateLeadStatus → PATCH /api/v1/leads/{id}/status  
     both invalidatesTags: ['Lead'].  
  c. leadSlice extraReducers: handle createLead.fulfilled to upsert new lead.  
  d. Ensure providesTags on getLeads already uses ['Lead']; add transformResponse to include page meta as current code does.  

4. New Artifacts  
  • src/store/api/leadApi.ts (mutations).  
  • src/store/slices/leadSlice.ts (caseReducers).  

5. Expected Outputs  
  Creating/updating a lead causes MyLeads list & badge to refresh in ≤ 3 s automatically.

6. Testing  
  • Unit tests for mutation reducers.  
  • Integration test with mock server – create lead → badge ++ & list item appears.

--------------------------------------------------------------------
SUB-TASK 7  (2 SP) “Unit & Component Test Suite”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  New tests achieve ≥ 85 % coverage on new business logic.  
  A2  All jest suites pass & overall project coverage ≥ 80 %.  

2. Dependencies  
  • All previous sub-tasks.  

3. Implementation Approach  
  a. Add tests under __tests__/store, __tests__/hooks, __tests__/components.  
  b. Use jest-axe for SearchBar & FilterSheet accessibility.  

4. Artifacts  
  • leadSelectors.filter.test.ts  
  • useOverdueBadge.test.tsx  
  • FilterSheet.test.tsx  
  • SearchBar.test.tsx  

5. Expected Outputs  
  CI badge remains green.

6. Testing Requirements  
  SonarQube gate (lines 80 % / logic 85 % / APIs 80 %).  

--------------------------------------------------------------------
SUB-TASK 8  (3 SP) “E2E & Integration – Badge Flow”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  Detox test: Create lead via AddLeadScreen → badge increments.  
  A2  Apply filter “Won” → list empty → empty-state shows correct message.  
  A3  Remove filters → list restores.  

2. Dependencies  
  • Sub-tasks 4–6 finished.  
  • Existing e2e infrastructure.

3. Implementation Approach  
  a. Add e2e/leadsFilter.e2e.ts:  
     login → open MyLeads → note badge → create lead (mock backend) → expect badge +1.  
  b. Extend syncMocks to return updated overdue count.  
  c. Update CI workflow mobile-ci-detox.yml to include new test.  

4. Artifacts  
  • e2e/leadsFilter.e2e.ts  
  • __tests__/integration/leadBadge.integration.test.ts  

5. Expected Outputs  
  GH Actions “mobile-ci-detox” passes.

6. Testing  
  iOS-sim run on PR; Android run nightly.

--------------------------------------------------------------------
SUB-TASK 9  (2 SP) “Docs & ADR Update”
--------------------------------------------------------------------
1. Acceptance Criteria  
  A1  Updated L3-LLD-CPAPP.md (Lead Module) reflects search/filter logic, auto-paging strategy & badge hook flow.  
  A2  ADR-0011-lead-filters.md recorded (decision to load remaining pages on filter for ≤ 600 users).  
  A3  README.md “Current Sprint” section lists new user capabilities.

2. Dependencies  
  • Functional implementation finished.

3. Implementation Approach  
  a. Create docs/adr/ADR-0011-lead-filters.md (include rationale for client-side filtering with auto-paging).  
  b. Amend docs/L3-LLD-CPAPP.md – add sequence diagram for badge update & note on accessibility requirements for FilterSheet.  
  c. Update CHANGELOG.md.  

4. Artifacts  
  • ADR file, doc edits – no code.

5. Expected Outputs  
  Docs pass markdownlint, included in docs metrics script.

6. Testing  
  • CI job docs-quality passes.

--------------------------------------------------------------------
GLOBAL QUALITY & CONSTRAINT CHECKLIST
--------------------------------------------------------------------
• Performance: selectors & badge hook use memoisation; auto-paging limited to 500 items to stay within memory/perf budget.  
• Security: no extra PII exposed; selectors run in memory only.  
• Accessibility: SearchBar & FilterSheet labelled; modal focus-trap & jest-axe pass; badge has accessibilityLabel “X overdue leads”.  
• Offline: filters/search operate on cached data; if filter triggered while offline and pages missing, user gets toast “Results may be incomplete”.  
• Design Consistency: all new UI uses ThemeProvider tokens; any deviations logged as tech-debt (Issue #1).  
• Navigation: Badge placed on Home tab (HomeTab route) aligning with current navigator to resolve Issue #4.  
• Config flags: MIN_SYNC_GAP_MS already in constants/sync.ts – reused by badge hook.  
• No drafts / offline writes introduced (aligns with Decision #1).  

--------------------------------------------------------------------
DELIVERABLES SUMMARY
--------------------------------------------------------------------
Code    : new UI components, hooks, RTK selectors/reducers, API mutations  
Tests   : unit + component + integration + detox e2e  
Docs    : ADR-0011, L3-LLD-CPAPP.md, CHANGELOG  
CI      : detox workflow updated; coverage thresholds unchanged  

All sub-tasks meet ≤ 4 SP, are independently testable & deployable, and collectively satisfy S3-TASK-03B acceptance criteria.