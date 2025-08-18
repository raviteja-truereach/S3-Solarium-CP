Implementation Backlog – S3-TASK-02  “Lead Module Foundation (Slice, API, Plain SQLite DAO)”
==================================================================================================================================

Legend  
SP = Story Points (1 SP ≈ ½ day effective)  
DAO = Data-Access Object  
All new paths are relative to `SOLARIUM-CPAPP/src`

-------------------------------------------------------------------
EPIC  • S3-TASK-02  (Total ≈ 18 SP)
Goal: End-to-end skeleton for Leads → REST → RTK-Query → Redux → SQLite DAO → SyncManager, with paging support, runtime payload validation and ≥ 90 % unit coverage on DAO.
-------------------------------------------------------------------

SUB-TASK 1 • Define & align Lead domain model (3 SP)  
Component(s): CPAPP-STATE
-------------------------------------------------------------------
1. Acceptance Criteria  
• `LeadModel.ts` exposes strict interface `Lead` + enum `LeadStatus`.  
• Fields match CDS (id, customerId, status, followUpDate, quotationRef, tokenNumber, pageNumber, syncStatus).  
• Side-effect-free; compiles with no TS errors and no circular deps.  
• Lightweight type-guards exported (`isLead`, `assertLead`) enabling runtime checks by other sub-tasks.

2. Dependencies  
• None (pure typings).

3. Implementation Approach  
a) Create `models/LeadModel.ts`; move existing interface from `database/models/Lead.ts`, add missing fields.  
b) Add `enum LeadStatus` (values from status matrix).  
c) Add runtime guard functions (`isLead(o: any): o is Lead`) and `assertLead(o: any): void` (throws on violation).  
d) Re-export via `types/api.ts` to keep external API imports stable.  
e) Update imports across codebase (`Lead` → `LeadModel`).  

4. New Artifacts  
• `models/LeadModel.ts` – type, enum, guards.  
• Update: `types/api.ts` – re-export.  

5. Expected Outputs  
• `yarn tsc` passes with updated imports.  

6. Testing Requirements  
• Jest type-guard tests (`isLead` true/false cases).  

7. Additional Specs  
• Runtime guards are tree-shaken for production builds (no reflection libs).  

-------------------------------------------------------------------
SUB-TASK 2 • Lead RTK-Query API Slice (4 SP)  
Components: CPAPP-LEAD, CPAPP-STATE
-------------------------------------------------------------------
1. Acceptance Criteria  
• `leadApi.ts` offers `getLeads({ page, limit })` returning `{ items, page, totalPages }`.  
• Default `pageSize = 20`; automatically injects `assignedTo=<auth.user.id>`.  
• `transformResponse` validates each record with `isLead`; invalid records are skipped with console warn and metric counter.  
• `transformResponse` derives `totalPages = Math.ceil(total / limit)` from backend `{ total, limit }` envelope (API contract compliance).  
• Provides tag type “Lead”; cache invalidates on logout.  

2. Dependencies  
• `baseApi.ts` (already configured).  
• Auth slice for `cpId`.  
• Runtime guards from Sub-task 1.

3. Implementation Approach  
a) Create `store/api/leadApi.ts`; inject endpoints into `baseApi`.  
b) Use `providesTags` & `invalidatesTags` pattern.  
c) Use `transformResponse` to:  
   – Validate envelope shape (`success`, `data.items`, `total`, `limit`, `offset`).  
   – Run `isLead` on every `item`; accumulate `validItems`.  
   – Compute `page = offset / limit + 1`, `totalPages`.  
d) Export `useGetLeadsQuery`.  
e) Ensure reducer & middleware injection is automatic (baseApi).  

4. New Artifacts  
• `store/api/leadApi.ts` (endpoint + hooks).  
• `utils/validators/apiEnvelope.ts` (optional helper for envelope validation).  

5. Expected Outputs  
• Successful `GET /api/v1/leads?page=1` returns flattened, validated `Lead[]` plus meta.  
• Invalid payloads are skipped and surfaced in dev logs; query returns `error` if envelope invalid.

6. Testing Requirements  
• Unit: mock fetch with two pages, envelope variations, invalid record.  
• Ensure `totalPages` computed correctly and invalid record skipped.  

7. Additional Specs  
• Re-use timeout / retry from `customBaseQuery`.  
• No extra dependencies (Zod etc.) – rely on custom guards to stay lightweight.  

-------------------------------------------------------------------
SUB-TASK 3 • leadSlice pagination & upsert (4 SP)  
Components: CPAPP-STATE
-------------------------------------------------------------------
1. Acceptance Criteria  
• `leadSlice` stores items as `Record<id, Lead>` plus paging meta: `pagesLoaded: number[]`, `totalPages`.  
• Reducers: `upsertLeads({ items, page, totalPages })`, `clearPages()`.  
• Selectors: `selectLeadsByPage(page)`, `selectAllLeadsSorted` (by next follow-up date).  

2. Dependencies  
• LeadModel (Sub-task 1).  
• leadApi hooks (Sub-task 2) – handled via `extraReducers`.

3. Implementation Approach  
a) Refactor `leadSlice.ts`:  
   – `items: Record<string, Lead>` (normalised).  
   – Add `pagesLoaded`, `totalPages`.  
b) Implement `upsertLeads` that merges without duplicates and updates paging meta.  
c) Add `extraReducers` → on `getLeads.fulfilled` dispatch `upsertLeads`.  
d) Expose new selectors in `store/selectors/leadSelectors.ts`.  

4. New Artifacts  
• `store/selectors/leadSelectors.ts` – advanced selectors.  

5. Expected Outputs  
• Request pages 1 & 2 → state has 40 unique leads, `pagesLoaded=[1,2]`, `totalPages` matches backend.  

6. Testing Requirements  
• Reducer & selector unit tests (≥ 90 % line coverage for slice).  

7. Additional Specs  
• Keep legacy selector exports for backward compatibility.  

-------------------------------------------------------------------
SUB-TASK 4 • Plain LeadsDAO pagination helpers (3 SP)  
Components: CPAPP-CACHE
-------------------------------------------------------------------
1. Acceptance Criteria  
• `LeadsDAO` exposes:  
  – `upsertMany(leads: Lead[], page: number): Promise<void>`  
  – `getPage(page: number): Promise<Lead[]>`  
  – `getAllIds(): Promise<string[]>`  
• Adds `page_number` INTEGER column (schema version 2).  
• Migration back-fills existing rows with `page_number = 1` to retain legacy cache integrity.  
• Inserting 100 leads ≤ 200 ms on dev device.  

2. Dependencies  
• Existing `BaseDao` pattern.  
• `schema.ts`, `migrations.ts`.

3. Implementation Approach  
a) `schema.ts`: increment `CURRENT_SCHEMA_VERSION → 2`; modify `CREATE_LEADS_TABLE` to include `page_number INTEGER DEFAULT 1`.  
b) `migrations.ts`: new step `migrateTo2_addPageNumber`  
   – `ALTER TABLE leads ADD COLUMN page_number INTEGER DEFAULT 1;`  
   – `CREATE INDEX IF NOT EXISTS idx_leads_page_number ON leads(page_number);`  
c) `LeadDao`:  
   – Extend `buildUpsertQuery` to accept `page_number`.  
   – Implement `upsertMany`, `getPage`, `getAllIds`.  
d) Add DAO unit tests & performance measurement stub.  

4. New Artifacts  
• `database/migrations/steps/v2_add_page_to_leads.ts` (if split file style).  

5. Expected Outputs  
• Jest DAO tests: insert/read page flow passes.  
• Legacy DB auto-migrates with `page_number` back-filled.  

6. Testing Requirements  
• DAO unit tests ≥ 90 % line, 85 % branch.  
• Migration test simulating v1 → v2 upgrade.  

7. Additional Specs  
• Keep encryption OFF (plain `react-native-sqlite-storage`).  

-------------------------------------------------------------------
SUB-TASK 5 • SyncManager page-aware fetch, validation & atomic persistence (2 SP)  
Components: CPAPP-CACHE, CPAPP-SYNC
-------------------------------------------------------------------
1. Acceptance Criteria  
• `SyncManager` iterates `/leads?page=n` until `n > totalPages`.  
• All pages fetched first, each payload validated (`assertLead`) before any DB write.  
• Pages persisted inside a SINGLE DB transaction (`upsertMany`) to guarantee all-or-nothing.  
• If any fetch, validation or DAO error occurs, transaction must not commit; SyncManager emits `syncFailed` with reason `LEADS_INCOMPLETE`.  
• `recordCounts.leads` correct on success.  

2. Dependencies  
• leadApi or internal `fetchWithRetry` uses same endpoint;  
• LeadsDAO changes (Sub-task 4).

3. Implementation Approach  
a) In `SyncManager.performSync()` replace single fetch with loop:  
   – Call `/api/v1/leads?page=1&limit=20`; read `totalPages`.  
   – Fetch pages 2…N in parallel (Promise.all with retry) or sequentially (keep simple).  
   – Validate each page; accumulate `validPages`.  
b) If any page fetch fails → abort and emit `syncFailed`.  
c) Begin DB transaction → for each page call `leadDao.upsertMany(validLeads, pageNo)`; commit only after all succeed.  
d) Only after commit update `sync_metadata` and emit `syncFinished`.  
e) Propagate DAO errors up so UI (TopBar Sync button) shows toast via existing error middleware.  

4. New Artifacts  
• None (modify `src/sync/SyncManager.ts`).  

5. Expected Outputs  
• ManualSync with mocked 3-page server persists 60 leads atomically.  
• Failure on page 2 leaves DB unchanged and sync state “failed”.  

6. Testing Requirements  
• Integration test `SyncSystemIntegration` – happy path & mid-page failure.  
• Assert `sync_metadata` not updated on failure.  

7. Additional Specs  
• Retain existing throttle & mutex logic.  

-------------------------------------------------------------------
SUB-TASK 6 • Comprehensive Tests & Coverage badge (2 SP)  
Components: CPAPP-TEST
-------------------------------------------------------------------
1. Acceptance Criteria  
• New Jest suites: `leadApi.test.ts`, `leadSlicePagination.test.ts`, updated `LeadDao.test.ts`.  
• DAO lines coverage ≥ 90 %, branch ≥ 85 %; project overall ≥ 80 %.  
• Integration tests cover atomic persistence & error propagation.  
• Coverage badge pipeline reflects new metrics.  

2. Dependencies  
• All previous sub-tasks.

3. Implementation Approach  
a) Extend `__tests__/mocks/fetchMock.ts` – paged leads responses & envelope variants.  
b) Add `__tests__/store/api/leadApi.test.ts` (payload validation, page meta).  
c) Add `__tests__/store/slices/leadSlicePagination.test.ts`.  
d) Extend existing `LeadDao.test.ts` with `upsertMany` + `getPage`.  
e) Update `SyncSystemIntegration.test.ts` for atomic persistence scenario.  

4. New Artifacts  
• Files as above.

5. Expected Outputs  
• `yarn test --coverage` passes; coverage badge regenerated by script.  

6. Testing Requirements  
• SonarQube gates: 80 %+ overall, 85 %+ business logic, 80 %+ APIs.  

7. Additional Specs  
• Use fake timers for retry logic; keep tests deterministic.  

-------------------------------------------------------------------
SUB-TASK 7 • Documentation & ADR update (2 SP)  
Components: CPAPP-DOC
-------------------------------------------------------------------
1. Acceptance Criteria  
• `docs/adr/ADR-0009-lead-module-foundation.md` added (records decisions incl. runtime validation & atomic paging).  
• `sprint-progress-S3-TASK-02.md` updated.  
• `L3-LLD-CPAPP.md` sequence & ER diagrams updated (page_number, validation flow).  

2. Dependencies  
• Coding tasks completed.

3. Implementation Approach  
a) Write ADR including trade-offs of custom guards vs heavy libs, atomic sync decision, default `page_number` backfill.  
b) Update mermaid diagrams & doc references.  
c) Add CHANGELOG entry.  

4. New Artifacts  
• Files as above.

5. Expected Outputs  
• `markdownlint` passes; docs metrics script green.

6. Testing Requirements  
• `npx markdownlint **/*.md` clean.

7. Additional Specs  
• Follow existing ADR template.  

-------------------------------------------------------------------
DEPENDENCY GRAPH (execution order)
1️⃣ Sub-task 1 → 2,3,4  
2️⃣ Sub-task 2 → 3,5,6  
3️⃣ Sub-task 3 → 6  
4️⃣ Sub-task 4 → 5,6  
5️⃣ Sub-task 5 → 6  
6️⃣ Sub-task 6 → (final code freeze)  
7️⃣ Sub-task 7 → parallel with 6 (after design stabilises)  

-------------------------------------------------------------------
GLOBAL ACCEPTANCE (Epic)  
✓ API layer aggregates paged `/leads` into Redux state with runtime validation and correct `totalPages` calculation.  
✓ leadSlice exposes selectors with combined list and page meta; state consistent after partial failures.  
✓ LeadsDAO stores & retrieves ≥ 100 leads with ≤ 5 % perf regress; schema migration v2 back-fills `page_number`.  
✓ SyncManager writes leads atomically; failure surfaces error and leaves DB unchanged.  
✓ No SQLCipher dependency in `build.gradle` or `Podfile.lock`.  
✓ Jest & integration suites pass; DAO coverage ≥ 90 %.  
✓ Error cases (invalid payload, DAO failure) trigger `syncFailed` and user feedback.  
✓ Documentation & ADR up to date.  

-------------------------------------------------------------------
Notes & Non-functional  
• Performance – index `idx_leads_page_number` for quick page lookup.  
• Security – local DB remains unencrypted per KD; runtime guards prevent malformed data corruption.  
• Migration – v1→v2 auto; existing rows get `page_number = 1`; SyncManager triggers full resync if column missing.  
• Error Handling – SyncManager emits granular failure reasons (`AUTH_EXPIRED`, `LEADS_INCOMPLETE`, `DAO_ERROR`).  
• Future – guards reusable for offline create/merge strategy; atomic sync pattern scales to other entities.  

-------------------------------------------------------------------
End of Backlog
-------------------------------------------------------------------