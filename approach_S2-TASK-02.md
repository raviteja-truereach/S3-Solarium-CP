Implementation Backlog - S2-TASK-02  
Component: CPAPP-SYNC  │ Related: CPAPP-CACHE, CPAPP-STATE  

--------------------------------------------------------------------
EPIC  –  “Sync Manager – Core Engine with Token-Expiry Handling”
Goal: A singleton SyncManager service able to (1) fetch Leads / Customers / Quotations from the backend, (2) overwrite the encrypted SQLite cache in one atomic pass, (3) update Redux slices + SyncMetadata, (4) abort and trigger logout on HTTP 401, (5) retry 5xx errors with exponential back-off, and (6) expose manualSync() for UI / timers, preventing concurrent runs.  
--------------------------------------------------------------------

Story-point scale: 1 = ½ day, 2 = 1 day, 3 = 1½ days, 4 = 2 days.  
All sub-tasks are ≤ 4 pts and follow INVEST.

====================================================================
SUB-TASK 1  (2 pts)  –  “Create SyncManager Skeleton & Types”
====================================================================
Acceptance Criteria  
1. src/sync/SyncManager.ts exists and compiles without eslint/jest errors.  
2. Singleton pattern enforced: `SyncManager.getInstance()` always returns the same object.  
3. Public API surface:  
   • `manualSync(source?: 'manual'|'timer'): Promise<SyncResult>`  
   • `isSyncRunning(): boolean`  
   • internal typed events ‘syncStarted / syncFinished / syncFailed’  

Dependencies  
• None (green-field file).  

Implementation Approach (WHAT)  
a. Create new folder src/sync/.  
b. Define SyncResult interface in new src/sync/types.ts.  
c. Implement private constructor + static getInstance().  
d. Stub manualSync() that immediately resolves with `{success:true}`.  
e. Add simple EventEmitter (node:events or tiny-emitter).  

New Code Artifacts  
• src/sync/SyncManager.ts – class skeleton.  
• src/sync/types.ts – `interface SyncResult { success:boolean; error?:string }`.  

Expected Outputs  
• Successful `yarn test` & `yarn ios/android` build.  

Testing Requirements  
• Unit test `SyncManagerSingleton.test.ts` ensuring singleton and default flags.  
Coverage on this file ≥ 90 %.  

Additional Specs  
• Place under `"sync"` barrel export later.  

====================================================================
SUB-TASK 2  (3 pts)  –  “Implement Backend Fetch Layer with 401 & 5xx Handling”
====================================================================
Acceptance Criteria  
1. SyncManager fetches `GET /leads`, `/customers`, `/quotations` using JWT header prepared by existing customBaseQuery.  
2. On first 401 it:  
   • emits ‘syncFailed’ with reason `AUTH_EXPIRED`  
   • dispatches `performLogout()` and stops further requests.  
3. On 5xx it performs exponential back-off (1 s ➜ 2 s ➜ 4 s) max 3 attempts per endpoint, then emits ‘syncFailed’.  
4. Fetch layer returns parsed JSON arrays typed as Lead[] | Customer[] | Quotation[].  

Dependencies  
• Sub-task 1 (file exists).  
• store/thunks/authThunks.performLogout  

Implementation Approach  
a. Add private helper `fetchWithRetry<T>(endpoint:string): Promise<T[]>`.  
b. Use fetchBaseQuery from src/store/api/baseQuery.ts directly (import throttled instance) OR plain fetch with same headers.  
c. Implement retry loop & back-off using Network.API_TIMEOUT_MS.  
d. Inject Redux store via dynamic import to dispatch logout on 401.  

New Code Artifacts & Functions  
• In SyncManager.ts  
  – `private async fetchWithRetry<T>(endpoint: string): Promise<T[]>`  
  – `private handleAuthFailure(): void`  

Expected Outputs  
• Unit tests covering: success, 401 triggers logout, 500 triggers retries then failure (jest fetchMock).  

Testing Requirements  
• __tests__/sync/SyncFetch.test.ts  
• Use jest-fake-timers to validate back-off sequence.  

Additional Specs  
• No UI code yet.  

====================================================================
SUB-TASK 3  (3 pts)  –  “Atomic Cache Overwrite & SyncMetadata Update”
====================================================================
Acceptance Criteria  
1. After successful fetch, existing rows in Leads, Customers, Quotations tables are replaced with server data in a single SQLCipher transaction (server-wins) **and only if the fetched array for that entity type contains at least one record**. If a server array is empty, the corresponding table is left untouched to avoid unintended data loss.  
2. SyncDao records last_sync_timestamp, record_count for each table with status ‘completed’.  
3. On SQLite error, entire transaction is rolled back and emits ‘syncFailed’.  

Dependencies  
• Sub-task 2 (data arrays).  
• Existing DAOs (LeadDao, CustomerDao, QuotationDao, SyncDao).  
• DatabaseProvider (open DB instance).  

Implementation Approach  
a. Inside SyncManager add method `persistAll(data: {leads:[...], customers:[...], quotations:[...]})`.  
b. Use `db.transaction` manual wrapper; within the transaction:  
   • **If `payload.leads.length > 0` then** `deleteAll()` + `upsertAll()` for leads.  
   • Repeat guard logic for customers and quotations.  
c. After commit, call `syncDao.markSyncCompleted()` per table.  
d. On error: `syncDao.markSyncFailed()` + rollback.  

New Functions  
• `private async persistAll(payload: PersistPayload): Promise<void>`  
• `type PersistPayload` in types.ts  

Expected Outputs  
• Row counts after sync equal fetched counts for non-empty entity arrays; unchanged for entities that returned empty arrays.  

Testing Requirements  
• Integration test `CacheOverwrite.integration.test.ts` using isolated in-memory test DB:  
  – happy-path overwrite with non-empty arrays  
  – verify no delete occurs when server returns empty array (row counts unchanged)  
  – simulate failure mid-transaction to assert rollback (rows unchanged).  

Performance Considerations  
• Wrap WAL mode already enabled; ensure PRAGMA synchronous=NORMAL inside DatabaseProvider (already).  

====================================================================
SUB-TASK 4  (2 pts)  –  “Redux Slice Hydration After Sync”
====================================================================
Acceptance Criteria  
1. After successful persist, SyncManager dispatches:  
   • leads.setItems([...]) + leads.setLastSync(now)  
   • customers.setItems([...]) + customers.setLastSync(now)  
   • quotations slice (to be created later) stub ignored for now.  
2. Redux DevTools shows updated counts immediately.  

Dependencies  
• Sub-task 3 (data persisted).  

Implementation Approach  
a. Import store via dynamic import to avoid circular deps.  
b. Dispatch actions inside SyncManager once persistAll() resolves.  
c. Add optional callback param to manualSync for UI “onFinished”.  

New Functions  
• none, new code inside SyncManager.  

Expected Outputs  
• Redux slices reflect fresh data and timestamps.  

Testing Requirements  
• Unit test with real Redux store (`@reduxjs/toolkit` configureStore) verifying state changes.  

Additional Specs  
• Ensure no state update when sync fails.  

====================================================================
SUB-TASK 5  (2 pts)  –  “Concurrency Guard, NetInfo Check & Public API Polishing”
====================================================================
Acceptance Criteria  
1. If manualSync() is called while a sync is running, it returns the existing promise rather than starting a new run.  
2. manualSync() refuses to start when ConnectivityContext `isOnline` = false and resolves with `{success:false, error:'OFFLINE'}`.  
3. Emits ‘syncStarted’ before work and ‘syncFinished’ after success.  

Dependencies  
• Sub-tasks 1-4.  
• ConnectivityProvider hook.  

Implementation Approach  
a. Add private flag `runningPromise: Promise<SyncResult>|null`.  
b. Read connectivity via `NetInfo.fetch` to avoid React context in non-component code.  
c. Wrap calls in try/catch to reset flag.  

New Code  
• Additional logic inside SyncManager.manualSync().  

Testing Requirements  
• Concurrency test: two calls resolve to same reference.  
• Offline test using NetInfo mock returns success:false.  

====================================================================
SUB-TASK 6  (3 pts)  –  “Comprehensive Test Suite & Coverage Gate”
====================================================================
Acceptance Criteria  
1. New Jest tests cover ≥ 85 % lines of SyncManager.ts and ≥ 80 % statements overall (project).  
2. Test scenarios:  
   • happy-path success  
   • 401 logout path  
   • 5xx back-off then success  
   • SQL error rollback  
   • offline early-exit  
   • duplicate-call guarding  
   • **empty-server-array safeguard (no data loss)**  

Dependencies  
• All previous sub-tasks code merged.  
• Existing mocks (NetInfoMock, fetchMock, SQLite test db).  

Implementation Approach  
a. Add __tests__/integration/syncFlow.integration.test.ts for end-to-end.  
b. Re-use sqlite test helpers in src/database/testDatabase.ts; **ensure each test creates and disposes an isolated in-memory (or temp file) SQLCipher database to prevent cross-test state leakage.**  
c. Extend coverage badge script if counters change.  

New Test Files  
• __tests__/sync/… (multiple).  

Expected Outputs  
• CI passes, coverage badge updated.  

====================================================================
SUB-TASK 7  (2 pts)  –  “CI / Docs / Developer DX Updates”
====================================================================
Acceptance Criteria  
1. `yarn test` & GitHub Actions updated to include new tests; pipelines green.  
2. Docs:  
   • docs/adr/ADR-0006-sync-manager.md summarising design.  
   • README “Offline Sync” section updated with manualSync usage.  
3. Code owners notified via CHANGELOG entry.  

Dependencies  
• Sub-task 6 (tests ready).  

Implementation Approach  
a. Update jest.config.js collectCoverageFrom to include src/sync/*.ts.  
b. Add badge generation path in scripts/generate-badges.js.  
c. Write ADR.  

Expected Outputs  
• PR description auto-links ADR + coverage badge.  

====================================================================
GLOBAL TESTING CRITERIA
--------------------------------------------------------------------
• Unit tests for each new public function.  
• Integration tests with **isolated** in-memory SQLCipher (unencrypted for CI speed).  
• SonarQube gates: 80 % overall, 85 % business logic, 80 % API.  
• Manual smoke test on device: trigger Settings➜“Sync Now” (temporary button) and verify toast & DB row counts.  

====================================================================
ADDITIONAL SPECIFICATIONS
--------------------------------------------------------------------
Security  
• All network calls continue to go through HTTPS (appConfig.apiUrl already TLS).  
• No plain-text logging of JWT or PII; redact in console logs (`[hidden]`).  
• SQLCipher key already stored in Keychain; SyncManager never exposes it.  

Performance  
• Batch DAO inserts use WAL mode; measured target < 5 s for 500 leads on emulator.  
• **PersistAll deletes only if new result length > 0 to avoid accidental data wipe (validated by tests).**  

Error-Handling  
• All errors bubble to SyncResult.error; UI can surface Snackbar later.  

Deployment  
• No native code changes; over-the-air JS update sufficient.  

--------------------------------------------------------------------
Deliverables: code, tests, documentation, ADR, updated CI.  
The above backlog breaks the large feature into 7 atomic, testable sub-tasks, each ≤ 4 story points, fully describing acceptance, dependencies, implementation path, artefacts, and testing.