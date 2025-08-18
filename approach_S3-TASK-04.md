Implementation Backlog – S3-TASK-04  “Add-New-Lead  –  Online Creation Flow”  
======================================================================

Legend:  
• SP = Story Points (2–4) • CPAPP = Channel-Partner App code-base  
• All new files are TypeScript (.tsx / .ts) unless stated otherwise  
  
----------------------------------------------------------------------
MASTER STORY
“As a Channel Partner I can create a new lead while online, with immediate field validation and duplicate-phone prevention, so that potential customers are captured in the system and I am redirected to the Lead-Detail screen on success.”

----------------------------------------------------------------------

SUB-TASK 1 – Create lead-input validation schema (SP 2)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. A Zod schema exists that mirrors all mandatory fields and limits (name ≤ 100, phone 10 digits, address ≤ 500, pin 6 digits, email optional, services optional).  
   b. Schema raises custom error messages identical to backend responses.  
   c. Unit tests cover ≥ 90 % branches (valid, each invalid field, overall success).  

2. Dependencies  
   • zod (already in repo via other forms) • No other sub-task needed first.  

3. Implementation Approach  
   • Create schema object in new shared file so it can be reused by tests & other screens.  
   • Export `type NewLeadFormData` generated from Zod’s `infer`.  

4. New Code Artifacts  
   • src/validation/leadSchema.ts  
     – export const addLeadSchema: z.ZodObject<{…}>  
     – export type NewLeadFormData = z.infer<typeof addLeadSchema>;  

5. Expected Outputs  
   • Compiles with no linter errors, exported types auto-available in IDE.  

6. Testing Requirements  
   • __tests__/validation/addLeadSchema.test.ts (Jest) – 15+ assertions incl. edge limits.  

7. Additional Specifications  
   • Error messages must match constant keys in strings.ts for i18n readiness.  

----------------------------------------------------------------------

SUB-TASK 2 – Build AddLeadScreen UI scaffold (SP 3)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. Screen displays all fields in design spec; uses react-native-paper inputs.  
   b. Validation errors appear inline on blur/submit.  
   c. “Save” button disabled until form is valid AND device is online.  

2. Dependencies  
   • Completion of Sub-task 1 (schema).  
   • ConnectivityContext already exists.  

3. Implementation Approach  
   • Use react-hook-form (already in repo for other forms) with zodResolver(addLeadSchema).  
   • Layout inside existing ScreenContainer.  
   • Floating “Save” button using AppButton.  
   • Add React Navigation route: ‘AddLead’ in HomeStack.  

4. New Code Artifacts  
   • src/screens/leads/AddLeadScreen.tsx  
     – internal hook `useAddLeadForm()` returns form methods & submit handler.  
   • src/navigation/types.ts – extend HomeStackParamList { AddLead: undefined }.  
   • src/navigation/HomeStack.tsx – add <Stack.Screen name="AddLead" …/>  

5. Expected Outputs  
   • Instrumented in navigation – FAB (currently disabled) will navigate here (handled in Sub-task 4).  

6. Testing Requirements  
   • RTL component test: renders correctly, required fields show errors on empty submit.  
   • Axe accessibility test passes.  

7. Additional Specs  
   • KeyboardAwareScrollView for field focus scroll.  
   • Re-use AppTextInput & custom phone mask util already in LoginScreen.  

----------------------------------------------------------------------

SUB-TASK 3 – Duplicate-phone live check hook (SP 2)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. Typing a 10-digit phone triggers debounced (400 ms) backend check.  
   b. If backend returns existing customer, red helper text “Phone already exists” shows and Save button remains disabled.  
   c. No duplicate request spam (max 1 call per second).  

2. Dependencies  
   • customerApi query endpoint must exist (created in this task).  

3. Implementation Approach  
   • Create `customerApi` in src/store/api/customerApi.ts (RTK Query createApi) with tagTypes ['Customers'].  
   • Add endpoint `getCustomerByPhone` → GET `/api/v1/customers?phone={phone}` (returns 200 with array or 404).  
     – providesTags: [{ type: 'Customers', id: 'PHONE_CHECK' }]  
   • Create `usePhoneDuplicateCheck.ts` in hooks that:  
     – exposes `status, isDuplicate`.  
     – internally debounces input value (400 ms) and calls `getCustomerByPhone`.  
   • Integrate hook into AddLeadScreen – show helper text underneath phone field.  

4. New Code Artifacts  
   • src/hooks/usePhoneDuplicateCheck.ts  
   • src/store/api/customerApi.ts – new API wrapper with `getCustomerByPhone` query.  

5. Expected Outputs  
   • Network profiler shows single request series while typing.  

6. Testing Requirements  
   • Hook unit tests (jest-react-hooks) – debounce timing, duplicate true/false.  

7. Additional Specs  
   • If network offline, skip check and allow form but submission will be blocked by ConnectivityProvider (Sub-task 4).  

----------------------------------------------------------------------

SUB-TASK 4 – End-to-end createLead mutation & navigation (SP 3)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. Pressing “Save” while online calls POST /api/v1/leads with payload matching API sheet.  
   b. Positive 201 response:  
      – Toast “Lead created” (react-native-toast-message).  
      – Navigation reset to LeadDetail screen (already exists) with route param {leadId}.  
      – RTK‐Query invalidatesTags ['Leads'] so MyLeads list refreshes automatically.  
   c. 409 or 4xx error shows toast using error middleware; form stays open.  
   d. Attempting to submit offline triggers banner “Go online to create a lead”.  

2. Dependencies  
   • Sub-tasks 1-3 complete.  
   • leadApi already has createLead mutation (verify tag invalidation, adapt if needed).  

3. Implementation Approach  
   • Amend createLead endpoint to `invalidatesTags:['Leads']`.  
   • In AddLeadScreen’s onSubmit: `const [createLead] = useCreateLeadMutation()` → handle promise unwrap.  
   • Use navigation.navigate('LeadDetail', {leadId}) – route exists in HomeStack.  

4. New Code Artifacts / Updates  
   • src/store/api/leadApi.ts – ensure correct invalidation.  
   • src/components/common/ToastConfig.tsx (if not yet) centralises toast styles.  

5. Expected Outputs  
   • Manual test flow succeeds against staging backend.  

6. Testing Requirements  
   • RTL integration test with MSW mock server: verify API call & navigation.  
   • Unit test for mutation wrapper.  

7. Additional Specs  
   • Persist returned lead into SQLite cache via existing leadSlice hydration on tag refresh—no extra work.  

----------------------------------------------------------------------

SUB-TASK 5 – Offline & FAB integration (SP 2)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. FloatingActionButton on MyLeadsScreen is enabled only when device is online (useConnectivity().isOnline).  
   b. If offline, FAB greyed out and tooltip “No internet – cannot add lead” (existing DisabledFAB snapshot updated).  
   c. Navigation to AddLeadScreen guarded by AuthGuard automatically.  

2. Dependencies  
   • ConnectivityContext already in place.  
   • AddLeadScreen route (Sub-task 2).  

3. Implementation Approach  
   • Update `handleAddLead` in MyLeadsScreen.tsx line 340 to early-return when offline.  
   • Add `Tooltip` component (paper helper or custom).  

4. New/Updated Files  
   • src/components/common/Tooltip.tsx (if not present).  
   • src/screens/leads/MyLeadsScreen.tsx – adjustment.  

5. Expected Outputs  
   • e2e offline scenario passes (see Sub-task 7).  

6. Testing Requirements  
   • Existing DisabledFAB jest snapshot updated.  
   • New unit test for Tooltip logic.  

7. Additional Specs  
   • Performance: zero re-renders when NetInfo state unchanged (memoize selector).  

----------------------------------------------------------------------

SUB-TASK 6 – Unit & component test suite expansion (SP 2)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   • ≥ 85 % line coverage on new AddLeadScreen, validation hook & duplicate hook.  
   • Tests run green in CI (mobile-ci.yml).  

2. Dependencies  
   • Sub-tasks 1-4 code completed.  

3. Implementation Approach  
   • Write tests in __tests__/screens/AddLeadScreen.test.tsx with RTL & jest-axe.  
   • Hook tests in __tests__/hooks/usePhoneDuplicateCheck.test.tsx  

4. New Files  
   • As above.  

5. Expected Outputs  
   • `yarn test` shows new suites, coverage badge updates automatically via existing script.  

6. Testing Requirements  
   • Simulate online/offline via NetInfo mock.  

----------------------------------------------------------------------

SUB-TASK 7 – Detox e2e: happy-path & offline-block (SP 3)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. `loginSuccess.e2e.ts` extension (or new file addLeadFlow.e2e.ts) automates:  
      – Login → navigate to MyLeads → tap FAB → fill form → submit → lands on LeadDetail.  
   b. Scenario: toggle airplane-mode (Detox device.setURLBlacklist) before tapping FAB -> tooltip appears, no navigation.  

2. Dependencies  
   • All previous sub-tasks.  

3. Implementation Approach  
   • Use existing NetInfo mock helpers.  
   • Ensure test data phone number generated unique by timestamp to avoid duplicate.  

4. New Files  
   • e2e/addLeadFlow.e2e.ts  

5. Expected Outputs  
   • Mobile-ci-detox.yml passes in PR pipeline.  

6. Testing Requirements  
   • 2 flows, each ≤ 90 sec runtime on iOS simulator.  

----------------------------------------------------------------------

SUB-TASK 8 – Documentation & ADR update (SP 2)  
----------------------------------------------------------------------
1. Acceptance Criteria  
   a. docs/adr/ADR-0012-add-lead-flow.md records design decisions (duplicate check, online-only).  
   b. L3-LLD-CPAPP.md updated with AddLeadScreen diagram & sequence.  
   c. api-endpoint-reference-sheet.md updated (`getCustomerByPhone`).  
   d. Changelog entry added.  

2. Dependencies  
   • Features fully merged.  

3. Implementation Approach  
   • Follow repository doc lint script (`yarn md-lint`).  

4. New / Updated Docs  
   • docs/adr/ADR-0012-add-lead-flow.md  
   • docs/L3-LLD-CPAPP.md (append section)  
   • api-endpoint-reference-sheet.md  

5. Expected Outputs  
   • `yarn docs:validate` passes.  

6. Testing Requirements  
   • markdownlint & docs-quality CI job green.  

----------------------------------------------------------------------

GLOBAL NOTES & SPECIFICATIONS
• Security: Phone number input uses same masking & regex as LoginScreen.validatePhone(). Duplicate check now queries the customer-level endpoint (`/api/v1/customers?phone=`) to align with system-wide uniqueness rules. No local caching of partially-filled form.  
• Performance: Debounce for duplicate check set to 400 ms; maximum API calls ≤ 3 per user entry.  
• Error handling: All backend errors surfaced via errorMiddleware; local form errors via react-hook-form.  
• State Management: leadApi tag invalidation refreshes leadsSlice automatically; customerApi provides isolated cache for phone-duplicate lookups; no manual store writes required.  
• Config: No new .env keys.  
• Accessibility: All inputs have accessibilityLabel; Save button announces disabled state.  
• SonarQube: New code must not introduce critical / major issues and maintain > 80 % coverage thresholds enforced in pipeline.  

----------------------------------------------------------------------

Estimated Sprint Effort: 19 SP  
(backlog conforms to per-sub-task sizing 2-4 SP and INVEST principles)