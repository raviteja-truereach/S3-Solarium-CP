Implementation Backlog – S3-TASK-05  
Lead Detail Screen – Info Tab & Placeholder Tabs
====================================================================

Epic / Parent Task  
• S3-TASK-05 – Lead Detail Screen (Info Tab + Placeholder Tabs)  
Scope = Mobile (CPAPP) → sub-components: CPAPP-LEAD, CPAPP-STATE, CPAPP-UI

Target Sprint: Sprint-3  
Story-point budget: ≤ 20 SP (≈ 22 % sprint capacity)  
────────────────────────────────────────


SUB-TASK 1 – “Wire Navigation to LeadDetail” (2 SP)
----------------------------------------------------
1.  Acceptance Criteria  
    a. Tap on any lead card in MyLeadsScreen navigates to LeadDetailScreen with param { leadId }.  
    b. Type-safe route in HomeStackParamList; deep-link “cpapp://leads/<id>” opens the same screen.  
2.  Dependencies: existing MyLeadsScreen, HomeStack navigator.  
3.  Implementation Approach  
    • Extend navigation/types.ts → HomeStackParamList already has LeadDetail; confirm.  
    • Update LeadListItem & handleLeadPress in MyLeadsScreen.tsx to navigation.navigate('LeadDetail',{ leadId }).  
    • Add Linking listener in NavigationProvider for the deep-link pattern.  
4.  New Code Artifacts  
    – (mod) src/navigation/HomeStack.tsx → add <Stack.Screen name="LeadDetail" …>.  
    – (mod) src/screens/leads/MyLeadsScreen.tsx → enhanced handler.  
    – (new) src/navigation/deepLinks.ts (central registry for deep-links).  
5.  Expected Outputs: routable LeadDetailScreen (temporary blank).  
6.  Testing Requirements  
    • Jest: unit test LeadListItem press dispatches correct navigation call (useNavigation mock).  
    • Detox: e2e “viewLeadsFlow” → extend to assert new screen header visible.  
7.  Additional Specs: none.  


SUB-TASK 2 – “Scaffold LeadDetailScreen + TabView Shell” (3 SP)
----------------------------------------------------------------
1.  Acceptance Criteria  
    a. Screen renders within 100 ms with skeleton placeholder.  
    b. Contains TabView with 4 tabs: Info (default), Quotations (disabled but visible), Documents, Timeline.  
    c. Tabs other than Info show “Coming in Sprint-4”.  
    d. Attempting to tap disabled Quotations tab triggers unobtrusive toast “Coming soon” (UX cue).  
2.  Dependencies: Sub-task 1 complete.  
3.  Implementation Approach  
    • Use react-native-paper TabView (existing dependency).  
    • Lazy-load = lazy={true} & renderLazyPlaceholder.  
    • Custom renderTabBar:  
      – Applies opacity 0.4 & pointerEvents='none' to Quotations tab.  
      – onPress handler shows Toast when user taps the disabled tab.  
4.  New Code Artifacts  
    – src/screens/leads/LeadDetailScreen.tsx (container, route param validation, top-bar).  
    – src/components/leads/LeadTabPlaceholder.tsx (re-usable placeholder).  
    – src/constants/leadTabs.ts (enum & labels).  
    – src/components/common/DisabledTabToast.tsx (single-responsibility utility to show toast).  
5.  Expected Outputs: visually navigable TabView; Quotations tab disabled but clearly visible.  
6.  Testing Requirements  
    • RTL snapshot for initial render & tab switching.  
    • Unit test that disabled tab press triggers toast.  
    • Performance test: JS FPS > 55 when switching tabs (existing PerformanceMonitor util).  
7.  Additional Specs  
    • Apply ScreenContainer wrapper & TopBar title “Lead #…”.  
    • Accessibility: set accessibilityRole="tab".  


SUB-TASK 3 – “Implement LeadInfoTab component (+ Error/Empty States)” (3 SP)
------------------------------------------------------------------------------
1.  Acceptance Criteria  
    a. Displays (read-only) fields: Customer Name, Phone, Email, City, State, PIN, Current Status, Next Follow-up Date.  
    b. Skeleton loader until data available.  
    c. Handles missing optional fields gracefully (shows ‘—’).  
    d. When data retrieval fails (error or offline cache-miss) shows centred error state:  
       “Unable to load lead details” + Retry button.  
2.  Dependencies: Sub-task 2 (TabView shell ready).  
3.  Implementation Approach  
    • Functional component receives props { lead?: Lead; loading: boolean; error?: Error | 'cache-miss'; onRetry():void }.  
    • Use react-native-paper List.Item + Divider for rows.  
    • Renders <Call> & <SMS> action buttons next to phone (use Linking).  
    • Error state: react-native-paper Banner with Retry.  
4.  New Code Artifacts  
    – src/components/leads/LeadInfoTab.tsx  
      export interface LeadInfoTabProps { lead?: Lead; loading: boolean; error?: unknown; onRetry: () => void }  
    – (mod) src/constants/strings.ts → add labels & error messages.  
5.  Expected Outputs: Properly styled InfoTab with resilient error handling.  
6.  Testing Requirements  
    • Unit: render with mock lead → verify text.  
    • Unit: simulate error prop → error banner rendered & retry callback fired.  
    • A11y: axe-core no critical violations.  
7.  Additional Specs  
    • Retry triggers hook re-fetch (see Sub-task 4).  


SUB-TASK 4 – “Data Retrieval Hook with Offline Fallback + Error Surface” (4 SP)
--------------------------------------------------------------------------------
1.  Acceptance Criteria  
    a. useLeadById(leadId) returns { lead?:Lead; loading:boolean; error?:Error|'cache-miss'; source:'api'|'cache' }.  
    b. When offline or API 5xx, hook falls back to SQLite LeadDao.findById().  
    c. If both API and cache fail, error === 'cache-miss'.  
    d. Opening LeadDetail while offline displays cached data in < 800 ms (integration test).  
2.  Dependencies  
    – DatabaseProvider initialised (already exists).  
    – leadApi.getLeadById endpoint.  
3.  Implementation Approach  
    • Create hook in src/hooks/useLeadById.ts.  
      – Internally calls useGetLeadByIdQuery(leadId,{ skip: !isOnline }).  
      – On NetInfo offline OR query error: attempt local fetch via LeadDao.  
      – Maintain state via useState/useEffect; expose onRetry() to force re-query.  
4.  New Code Artifacts  
    – src/hooks/useLeadById.ts  
      export interface UseLeadByIdResult { lead?:Lead; loading:boolean; error?:Error|'cache-miss'; source:'api'|'cache'; onRetry:() => void }  
    – (mod) src/types/api.ts → add UseLeadByIdResult.  
5.  Expected Outputs: unified lead object for UI; loading waterfall avoided.  
6.  Testing Requirements  
    • Unit: mock NetInfo offline → assert dao called.  
    • Integration: measure mount time (<800 ms) when offline.  
    • Coverage ≥ 85 % for hook file.  
7.  Additional Specs  
    • Security: no sensitive fields logged.  
    • Performance: debounce onRetry to max 1 attempt per 2 s.  


SUB-TASK 5 – “Connect UI to Data + Stale & Error Indicators” (2 SP)
--------------------------------------------------------------------
1.  Acceptance Criteria  
    a. LeadDetailScreen passes hook output to InfoTab.  
    b. Displays chip “Offline copy” when source==='cache'.  
    c. If error present, InfoTab shows error banner; chip hidden.  
2.  Dependencies: Sub-tasks 2, 3, 4.  
3.  Implementation Approach  
    • LeadDetailScreen:  
      const { lead, loading, error, source, onRetry } = useLeadById(leadId);  
      Pass to <LeadInfoTab ... />.  
    • Top-bar Chip using react-native-paper Chip.  
4.  New Code Artifacts  
    – (mod) LeadDetailScreen.tsx  
5.  Expected Outputs: functional data-bound screen online & offline, error resilient.  
6.  Testing Requirements  
    • Unit: offline path displays chip.  
    • Unit: error path shows banner.  
    • Detox: e2e airplane-mode preset verifies chip & content.  
7.  Additional Specs: none.  


SUB-TASK 6 – “Placeholder Documents & Timeline Tabs + Disabled Quotation Tab UX” (2 SP)
---------------------------------------------------------------------------------------
1.  Acceptance Criteria  
    a. Documents & Timeline tabs show centred placeholder component.  
    b. Action buttons disabled; Tab titles greyed.  
    c. If TabView internal lazy load errors, show generic fallback “Tab unavailable. Try again later.”  
2.  Dependencies: Sub-task 2.  
3.  Implementation Approach  
    • Use LeadTabPlaceholder created earlier.  
    • Disabled Quotation tab: renderTabBar override (handled in Sub-task 2) already greys out; toast handled there.  
    • Wrap placeholder with ErrorBoundary to catch unexpected render failures.  
4.  New Code Artifacts  
    – (mod) LeadTabPlaceholder.tsx (accepts title & optional error flag).  
5.  Expected Outputs: clear UX communication with basic error fallback.  
6.  Testing Requirements  
    • Snapshot for placeholder rendering.  
    • Unit: simulate error → fallback message appears.  
7.  Additional Specs  
    • Maintain a11yRole="text" + testID for QA automation.  


SUB-TASK 7 – “Comprehensive Testing & QA Automation (incl. Error Paths)” (2 SP)
--------------------------------------------------------------------------------
1.  Acceptance Criteria  
    a. Jest, RTL, and Detox suites updated; overall coverage ≥ 80 %, business logic ≥ 85 %.  
    b. Error & empty states for InfoTab and placeholders covered.  
    c. CI pipeline passes on first run.  
2.  Dependencies: All previous sub-tasks.  
3.  Implementation Approach  
    • Unit: LeadInfoTab (data, error, empty), useLeadById hook (online, offline, error).  
    • Integration: Navigation flow MyLeads → LeadDetail, retry logic.  
    • Detox: e2e on iOS sim (online & offline) + disabled tab toast assertion.  
    • Performance: leadsDetail.test.tsx using PerformanceMonitor util.  
4.  New Code Artifacts  
    – __tests__/components/LeadInfoTab.test.tsx  
    – __tests__/hooks/useLeadById.test.ts  
    – __tests__/integration/LeadDetailFlow.test.tsx  
    – e2e/leadDetailOffline.e2e.ts  
5.  Expected Outputs: Green CI badges, updated coverage-badge script auto-runs.  
6.  Additional Specs  
    • SonarQube rules: no code smells > B; new code duplication < 3 %.  


SUB-TASK 8 – “Documentation & ADR Update” (2 SP)
-------------------------------------------------
1.  Acceptance Criteria  
    a. L3-LLD-CPAPP.md updated with new sequence diagram (LeadDetail load & error fallback).  
    b. ADR-0013-lead-detail-screen.md recorded (decision on offline fallback hook + error states).  
    c. README & sprint-progress-S3-TASK-05.md summarise implementation, error handling, and test commands.  
2.  Dependencies: After functional work done.  
3.  Implementation Approach  
    • Update docs/* and docs/adr/*.  
    • Run markdownlint & docs-quality script.  
4.  New Code Artifacts  
    – docs/adr/ADR-0013-lead-detail-screen.md  
    – docs/sprint-progress-S3-TASK-05.md  
5.  Expected Outputs: Docs pass validation in CI.  
6.  Testing Requirements: scripts/validate-docs.sh passes.  


────────────────────────────────────────
TOTAL ESTIMATE: 20 SP – split across two paired developers
────────────────────────────────────────

Cross-cutting Non-Functional Requirements
• Performance: open screen < 800 ms offline, steady-state FPS ≥ 55.  
• Security: no write operations; ensure phone links use tel: & sms: handlers.  
• Accessibility: all components pass axe-core; proper accessibilityRole=“tab” and clear toast announcements.  
• Error Handling: explicit skeleton, error, empty states for all tabs as defined above.  
• Lint & type-check: ESLint, TypeScript no-error.  
• CI: Existing GitHub Actions mobile-ci and mobile-ci-detox pipelines run green.  

End of Backlog