Implementation Backlog – S3-TASK-06  “Lead Status Update & Validation Logic”
==============================================================================

Epic Reference: CPAPP-LEAD  
Affected Areas: CPAPP-LEAD, CPAPP-STATE, CPAPP-UI, CPAPP-TEST

Overall Goal  
1. Allow a Channel Partner to change a lead’s status from LeadDetailScreen.  
2. Enforce client-side validation (remarks, follow-up date, **Quotation Ref, Token No.**) before calling backend PATCH /api/v1/leads/{id}/status.  
3. Provide optimistic UI with automatic rollback on failure **and guarantee that no local update is attempted when offline**.  
4. Refresh all lead lists within ≤ 5 s of success.  
5. Block updates while offline and surface a friendly message.  
6. Ship automated unit, integration, and Detox E2E tests covering success, validation errors, network failures, and rollback edge-cases.  

--------------------------------------------------------------------
Sub-Task Breakdown  (each 2-4 SP, **≈ 26 SP total**)  
--------------------------------------------------------------------

ST-06-1  Extend leadApi with status-mutation + quotation-query (3 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• useUpdateLeadStatusMutation is exported from leadApi.ts.  
• Endpoint config matches EP-BCKND-LEAD-005 (PATCH /api/v1/leads/{id}/status).  
• Provides onQueryStarted for optimistic update + rollback (server-wins).  
• Adds ‘Leads’ and ‘LeadById’ cache tags; invalidates both on success.  
• NEW: useGetQuotationsByLeadQuery returns all quotations for a given leadId (GET /api/v1/quotations?leadId={id}) and provides tag ‘QuotationsByLead’.  

Dependencies  
• leadApi base already exists.  

Implementation Approach  
1. In src/store/api/leadApi.ts  
    1.1 Add query endpoint getQuotationsByLeadId: builder.query<Quotation[], string>().  
    1.2 Add mutation endpoint updateLeadStatus as per spec.  
    1.3 Wire onQueryStarted to perform optimistic patch and capture undo.  
2. Define request/response TS interfaces:  
    – UpdateLeadStatusRequest, UpdateLeadStatusResponse  
    – Quotation (minimal fields: quotationId, totalPrice, status)  
3. Ensure providesTags/invalidatesTags cover ['Leads', {type:'LeadById',id}, {type:'QuotationsByLead',id}].  
4. Export generated hooks.

New Code Artifacts  
• src/types/api/leadStatus.ts – request/response interfaces.  
• src/types/api/quotation.ts – quotation DTO.  

Expected Outputs  
• Hooks usable by UI; Jest tests compile.  

Testing Requirements  
• Unit test: correct HTTP config, optimistic patch, tag invalidation.  
• Mock offline scenario verifies mutation not dispatched.  
• ≥ 85 % line coverage on new code.  

--------------------------------------------------------------------
ST-06-2  Create StatusValidationService (D-ART-014) (3 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• validateStatusChange(input) ⇒ {valid:boolean, errors?:Record<string,string>}.  
• Implements all rules from L1-FRS §3 (remarks ≥ 10, follow-up ≤ 30 d, Quotation Ref required for “Won”, Token No. for “Under Execution”, etc.).  
• Exposes helper isTransitionAllowed(curr, next).  
• 100 % branch coverage on rules.  

Dependencies  
• None (pure module).  

Implementation Approach  
1. Add src/validation/statusValidation.ts using zod (already in repo) or existing validators.  
2. Import status matrix from src/constants/leadStatus.ts.  
3. Return ValidationResult used by dialog.  
4. Export via barrel file src/validation/index.ts.

New Code Artifacts  
• src/validation/statusValidation.ts  
• Updates to src/types/lead.ts – StatusChangeDraft, ValidationResult.  

Expected Outputs  
• Reusable validation util with full tests.

Testing Requirements  
• Unit tests covering: valid path, missing remark, follow-up > 30 d, missing Quotation Ref, invalid transition, etc.  
• ≥ 90 % coverage for this file.

--------------------------------------------------------------------
ST-06-3  Build StatusChangeDialog UI component (D-SCR-005) (4 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• Modal sheet opens from “Change Status” FAB on LeadDetailScreen.  
• Shows:  
  – Current Status (read-only chip).  
  – Dropdown of allowed next statuses (filtered via isTransitionAllowed).  
  – Conditional fields: Follow-up date picker, Remark input, **Quotation Ref dropdown fetched via useGetQuotationsByLeadQuery, Token No. input.**  
• If next status = “Won”:  
  – Quotation list populated; Save disabled until a Quotation Ref is selected.  
  – When no quotations exist, “Won” is hidden/disabled and helper text “Generate and share a quotation before marking Won” shown.  
• “Save” button disabled until validateStatusChange returns valid:true.  
• Cancelling or swiping down closes dialog without side-effects.  

Dependencies  
• ST-06-1 (quotation query), ST-06-2.  

Implementation Approach  
1. Create src/components/leads/StatusChangeDialog.tsx.  
  – Use react-native-paper BottomSheetModal.  
  – useForm + real-time validation with StatusValidationService.  
  – Call useGetQuotationsByLeadQuery(leadId) on mount.  
2. Expose imperative open() / close() methods via forwardRef.  
3. Handle loading/empty quotations states.  

New Code Artifacts  
• src/components/leads/StatusChangeDialog.tsx  
• src/components/leads/__tests__/StatusChangeDialog.test.tsx  

Expected Outputs  
• Accessible, validated dialog component.

Testing Requirements  
• RTL tests: field enable/disable, validation messages, empty quotation state, save-disabled logic.  
• axe a11y test passes.

--------------------------------------------------------------------
ST-06-4  Integrate StatusChangeDialog into LeadDetailScreen (3 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• “Change Status” FAB visible only for non-terminal statuses AND when online.  
• Tapping FAB opens dialog; on save, calls useUpdateLeadStatusMutation.  
• While mutation pending, dialog shows loader; on success auto-dismiss & toast “Status updated”.  
• On error: dialog remains open, error banner shows backend error, optimistic patch rolled back **and lead data refetched from server**.  

Dependencies  
• ST-06-1, ST-06-3.  

Implementation Approach  
1. Add FAB to LeadDetailScreen.tsx (react-native-paper FAB).  
2. Guard with ConnectivityContext (offline ➜ toast “No internet connection”).  
3. Attach dialog ref and wire onSubmit → mutation.  
4. Listen to mutation isSuccess/isError to manage dismissal & refetch (leadApi.util.invalidateTags).  

New Code Artifacts  
• Update existing LeadDetailScreen.tsx.  
• src/constants/strings.ts – add new messages.  

Expected Outputs  
• End-to-end manual flow works on device.

Testing Requirements  
• Integration test simulating success & backend 400 error with rollback verification.  
• Dialog open time < 300 ms.

--------------------------------------------------------------------
ST-06-5  Offline & Error Handling Enhancements (2 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• If NetInfo reports offline, any attempt to open dialog shows toast “No internet connection. Please go online to proceed”.  
• If network drops or backend returns error, optimistic patch undone **and component triggers a forced reload of the single lead via refetch()**.  
• All error toasts use central ToastConfig.  

Dependencies  
• ST-06-4.  

Implementation Approach  
1. Extend utils/errorMessage.ts with key 'STATUS_FAIL'.  
2. In onQueryStarted rollback handler, call leadApi.util.invalidateTags(['LeadById']).  
3. Add useEffect in LeadDetailScreen to toast on isError.  

New Code Artifacts  
• src/utils/errorMessage.ts – mapping update.  

Expected Outputs  
• Graceful UX during offline/error cases.

Testing Requirements  
• Jest test: rejected promise ➜ state unchanged after refetch.  
• Detox offline scenario uses existing offlineBanner infra.

--------------------------------------------------------------------
ST-06-6  Redux Slice Sync & Cache Refresh (2 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• After successful status change, MyLeadsScreen list refreshes within ≤ 5 s (no manual pull).  
• Lead in Redux & SQLite cache reflects new status once server confirms.  

Dependencies  
• ST-06-1 optimistic patch + invalidation.  

Implementation Approach  
1. Rely on RTK Query cache for immediate UI; still schedule background SyncManager run (existing) to persist to SQLite.  
2. Ensure SyncManager ignores unchanged records to avoid thrash.  

New Code Artifacts  
• Optional tweak to leadSlice.ts if extraReducers needed.

Expected Outputs  
• UI consistency verified via tests.

Testing Requirements  
• useLeadById returns updated status immediately and after next sync cycle.

--------------------------------------------------------------------
ST-06-7  Unit & Integration Test Suite (3 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• ≥ 85 % coverage on new modules; global coverage remains ≥ 80 %.  
• Tests pass in CI.  
• Edge-cases covered: validation failure, backend 400, network drop mid-request with rollback & refetch.  

Dependencies  
• ST-06-1 → ST-06-6.  

Implementation Approach  
1. Unit tests: StatusValidationService, optimistic patch/rollback, quotation query.  
2. RTL integration tests for dialog & LeadDetailScreen flow.  
3. Mock server to simulate 2xx, 4xx, 5xx responses and delayed failures.  

New Code Artifacts  
• __tests__/validation/statusValidation.test.ts  
• __tests__/integration/LeadStatusFlow.test.tsx  

Expected Outputs  
• Green Jest run with updated coverage badge.

Testing Requirements  
• SonarQube quality gate passes.

--------------------------------------------------------------------
ST-06-8  Detox E2E: CustomerAccepted → Won (4 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• Automated scenario:  
  1. Pre-seed test server with lead in “Customer Accepted” and one shared quotation.  
  2. Login as CP.  
  3. Open lead detail, change status to “Won”, select Quotation Ref.  
  4. Assert toast success and UI shows “Won”.  
• Executed in GH Actions mobile-ci-detox workflow.  

Dependencies  
• All previous sub-tasks.  

Implementation Approach  
1. Add e2e/leadStatusUpdate.e2e.ts.  
2. Reuse helper navigation & NetInfo mocks.  
3. Extend test server stub routes for quotation list & PATCH.  

New Code Artifacts  
• e2e/leadStatusUpdate.e2e.ts  
• e2e/helpers/seedLead.ts (if needed).  

Expected Outputs  
• CI pipeline green with new test across iOS & Android.

Testing Requirements  
• E2E covers empty quotation list edge-case (status “Won” not selectable).

--------------------------------------------------------------------
ST-06-9  Documentation & ADR Update (2 SP)
--------------------------------------------------------------------
Acceptance Criteria  
• docs/adr/ADR-0014-lead-status-update.md created (decision record).  
• L3-LLD-CPAPP.md sequence diagram updated with status flow.  
• README & DOCUMENTATION_CHECKLIST entries updated.  

Dependencies  
• Implementation stable (post ST-06-6).  

Implementation Approach  
1. Document optimistic update decision, quotation-fetch logic, and offline guard.  
2. Update architecture diagrams (PlantUML exported PNG).

New Code Artifacts  
• docs/adr/ADR-0014-lead-status-update.md  
• Updates to docs/L3-LLD-CPAPP.md  

Expected Outputs  
• Docs pass markdownlint & docs-quality.js.

Testing Requirements  
• docs-quality CI stage passes.

--------------------------------------------------------------------
Cross-task Non-Functional Specifications
--------------------------------------------------------------------
• Security: JWT only in Authorization header; inputs sanitised; dialog blocked offline.  
• Performance: perceived latency < 150 ms (optimistic), dialog open < 300 ms.  
• Accessibility: all new UI elements labelled; axe checks pass.  
• Internationalisation: new strings added to constants/strings.ts.  
• Quality: SonarQube – no new code smells > minor.  
• Feature flags: none (fully enabled on merge).  
• Config/Env: no new env vars required.  

--------------------------------------------------------------------
Dependency Graph (simplified)
--------------------------------------------------------------------
ST-06-1 → ST-06-2 → ST-06-3 → ST-06-4 → ST-06-5 → ST-06-6  
ST-06-4 → ST-06-6  
All above → ST-06-7 → ST-06-8 → ST-06-9  

--------------------------------------------------------------------
Estimate Summary
--------------------------------------------------------------------
• ST-06-1: 3  
• ST-06-2: 3  
• ST-06-3: 4  
• ST-06-4: 3  
• ST-06-5: 2  
• ST-06-6: 2  
• ST-06-7: 3  
• ST-06-8: 4  
• ST-06-9: 2  
Total: **26 Story Points**

This updated backlog integrates reviewer feedback by explicitly handling quotation selection for “Won”, tightening offline/rollback safeguards, and expanding test coverage, while preserving scope, structure, and overall complexity.