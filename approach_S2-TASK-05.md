Implementation Backlog – S2-TASK-05  
“Dashboard & Lead List – Read-Only Data Binding”  

Legend:  
• SP = Story Points (1 SP ≈ ½ day effective work)  
• All sub-tasks follow INVEST & size ≤ 4 SP.  

====================================================  
EPIC:  S2-TASK-05 (Medium, 17 SP total)  
Goal:  Home (Dashboard) & My Leads screens must render real, cached data – fully functional in offline (read-only) mode.  

====================================================  

SUB-TASK 1 - “Redux glue – metrics & lead cache” (3 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. networkSlice exposes selector selectDashboardSummary(state) returning last persisted summary or undefined.  
   b. leadSlice already exposes selectLeads(state); it must deliver persisted items immediately after SyncManager.hydrateReduxSlices().  
   c. SyncManager emits hydrateReduxSlices() → both slices receive data in ≤ 50 ms (dev build).  

2. Dependencies  
   • SyncManager skeleton (existing)  
   • leadSlice, networkSlice already present  

3. Implementation Approach  
   a. Inspect SyncManager.hydrateReduxSlices() – finish TODO: dispatch(networkSlice.setDashboardSummary(payload.summary)).  
   b. Add selector & initialState.dashboardSummary in networkSlice.  
   c. Add unit tests for reducer + selectors.  
   d. Update docs/adr/ADR-0007 with “read-only hydration” note.  

4. New Code Artifacts  
   • src/store/slices/networkSlice.ts  
     – add field dashboardSummary?: DashboardSummary  
     – export function selectDashboardSummary(state: RootState): DashboardSummary | undefined  
   • No new files – only amendments.  

5. Expected Outputs  
   • Redux DevTools shows dashboardSummary populated after first sync call.  

6. Testing Requirements  
   • Jest reducer test: verifies setDashboardSummary mutation.  
   • Integration test update (__tests__/integration/SyncSystemIntegration.test.ts) – expect selectDashboardSummary not undefined after manualSync.  
   • ≥ 90 % branch coverage for new slice code.  

7. Additional Specs  
   • Do NOT create a new dashboardSlice to avoid state scatter; reuse existing networkSlice as per ADR-0006.  


SUB-TASK 2 - “Dashboard UI – live counters” (3 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. HomeScreen renders Today Pending, Overdue, Total using data from selectDashboardSummary; numbers update automatically when summary changes.  
   b. While summary undefined → shows shimmering skeleton (react-native-paper ActivityIndicator placeholder).  
   c. In offline + no summary cached → shows “–” (em-dash) with sub-label “No data yet”.  
   d. Accessibility: each counter container has accessibilityLabel including metric name + value.  
   e. Accessibility: each counter wrapper is a live region – declare `accessibilityLiveRegion="polite"` (Android) and `accessibilityRole="status"` / `importantForAccessibility="yes"` (iOS & web) so screen-readers announce value changes.  

2. Dependencies  
   • Sub-task 1 completed  
   • react-native-paper in project  

3. Implementation Approach  
   a. Create standalone component DashboardStatCard.tsx under src/components/dashboard/.  
   b. Replace inline metric JSX in HomeScreen with <DashboardStatCard title="Today Pending" value={displayData?.todayPending} … />.  
   c. Use React.memo; ensure colour props remain from theme.  
   d. Add skeleton view via conditional render.  
   e. Add the live-region attributes listed in Acceptance Criteria (e) and document with a comment referencing WCAG 4.1.3.  

4. New Code Artifacts  
   • src/components/dashboard/DashboardStatCard.tsx  
     - props: {title: string; value: number | undefined; testID?: string}  
     - returns <View testID={…}> … </View> with live-region props  
   • src/components/dashboard/index.ts (barrel export)  

5. Expected Outputs  
   • UI visually identical to design but driven by live data; screen-readers announce counter changes automatically.  

6. Testing Requirements  
   • RTL test DashboardStatCard.test.tsx – renders proper value, skeleton, and verifies live-region props.  
   • jest-axe assertion: no accessibility violations; ensure role/status & aria-live present.  
   • HomeScreen.test.tsx – mock selectDashboardSummary selector → assert counters update and announcements are triggered (use jest-mock-react-native-accessibility events).  

7. Additional Specs  
   • Performance: use useAppSelector with shallowEqual to avoid unnecessary re-renders.  
   • Accessibility: ensure counters’ font sizes respect user’s Dynamic Type settings.  


SUB-TASK 3 - “My Leads list – bind, paginate, empty” (4 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. MyLeadsScreen FlatList pulls items from selectLeads; length matches Redux items length.  
   b. Infinite scroll paginates every 20 items (client-side for now) using onEndReached; smooth 60 fps.  
   c. Empty state: If list length === 0 → show illustration + text “No leads yet”.  
   d. Works with device in airplane-mode when SQLite cache has data.  
   e. Status chip colour matches getStatusColor map.  

2. Dependencies  
   • Sub-task 1 (selectLeads hydrated)  

3. Implementation Approach  
   a. Add local state `displayedLeads` with default first 20.  
   b. Implement handleLoadMore() { setDisplayedLeads(prev => leads.slice(0, prev.length + 20)); }.  
   c. Add FlatList prop onEndReachedThreshold = 0.3.  
   d. Add EmptyState component (src/components/leads/EmptyLeadsState.tsx).  
   e. Ensure PullToRefreshControl still works.  

4. New Code Artifacts  
   • src/components/leads/EmptyLeadsState.tsx – simple centered View with Icon + Text.  

5. Expected Outputs  
   • Scrolling beyond 20 items autoloads next batch.  
   • jest-axe – list has accessibilityRole="list".  

6. Testing Requirements  
   • RTL tests in __tests__/screens/MyLeadsScreen.test.tsx:  
     – renders first 20 → scroll → expect 40 items.  
     – offline mock (NetInfo = false) still shows cached items.  
   • Jest fake timers for pagination events.  

7. Additional Specs  
   • Memory: avoid cloning lead objects; slice returns references.  
   • Maintain itemStableKey = lead.id.  


SUB-TASK 4 - “Disable Add Lead FAB (read-only mode)” (2 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. FloatingActionButton on MyLeadsScreen is rendered grey (theme.colors.outline) and disabled (press does nothing).  
   b. Accessibility label says “Add Lead – disabled”.  

2. Dependencies  
   • Sub-task 3 (screen UI)  

3. Implementation Approach  
   a. Add optional prop disabled to AppButton; pass disabled style.  
   b. Wrap existing FAB in conditional until S3.  
   c. Tooltip via react-native-paper onLongPress (“Coming soon”).  

4. New Code Artifacts  
   • src/components/common/AppButton.tsx – extend props {disabled?: boolean}.  

5. Expected Outputs  
   • FAB visually muted; snapshot updated.  

6. Testing Requirements  
   • RTL: press event not fired when disabled.  

7. Additional Specs  
   • Keep API backward compatible – existing usages unaffected.  


SUB-TASK 5 - “Navigation hook-up” (2 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. Tab “Home” shows HomeStack (Dashboard + MyLeads route unchanged).  
   b. MyLeads list accessible via “📋 View My Leads” button; hardware back returns to Dashboard.  
   c. No navigation errors in offline cold start.  

2. Dependencies  
   • Sub-tasks 2 & 3 implemented  

3. Implementation Approach  
   a. Confirm HomeStack already contains <Stack.Screen name="MyLeads" …>.  
   b. Ensure navigate('MyLeads') uses navigationRef for deep-link safety.  
   c. Add Detox e2e route smoke test.  

4. New Code Artifacts  
   • None – just navigation update and tests.  

5. Expected Outputs  
   • e2e: device.launch + login → tap view leads → list visible.  

6. Testing Requirements  
   • Detox script e2e/viewLeadsFlow.e2e.ts.  

7. Additional Specs  
   • Maintain current route names (public contract).  


SUB-TASK 6 - “Comprehensive Test & Coverage Gate” (2 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. Jest overall coverage ≥ 80 %, Home/Leads business logic ≥ 85 %.  
   b. New jest-axe assertions pass (no a11y violations).  
   c. Detox flow test green on CI.  

2. Dependencies  
   • All dev work finished.  

3. Implementation Approach  
   a. Add tests listed in previous sub-tasks.  
   b. Update scripts/generate-badges.js to include “dashboard” badge segment.  
   c. CI pipeline: adjust jest.config threshold if required.  

4. New Code Artifacts  
   • __tests__/components/dashboard/DashboardStatCard.test.tsx  
   • __tests__/components/leads/EmptyLeadsState.test.tsx  
   • e2e/viewLeadsFlow.e2e.ts  

5. Expected Outputs  
   • README coverage badge auto-updated.  

6. Testing Requirements  
   • SonarQube gate in GitHub Action must pass.  


SUB-TASK 7 - “Documentation & Changelog” (1 SP)  
----------------------------------------------------  
1. Acceptance Criteria  
   a. CHANGELOG.md contains S2-TASK-05 section with user-visible changes.  
   b. docs/adr/ADR-0007-sync-scheduler.md updated – note that UI now consumes cached data.  
   c. README “Feature Matrix” table ticked for “Dashboard counters” & “Leads list (read-only)”.  

2. Dependencies  
   • Feature complete (Sub-tasks 1-5).  

3. Implementation Approach  
   • Write docs; run yarn lint:md.  

4. New Code Artifacts  
   • CHANGELOG.md entry, ADR update.  

5. Expected Outputs  
   • Docs pipeline passes lint checks.  

6. Testing Requirements  
   • `scripts/validate-docs.sh` succeeds.  


====================================================  
GLOBAL TESTING & QUALITY CRITERIA  
• ESLint/Prettier clean; Jest + RTL + jest-axe + Detox green.  
• No new warnings during metro bundling.  
• SQLite read path exercised in offline integration test.  
• Security: counters & list operate on local Redux only – no extra network calls when offline.  
• Performance: HomeScreen re-renders ≤ 3 ms (Chrome profiler) after summary update (target dev).  

End of Backlog.