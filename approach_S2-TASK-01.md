Implementation Backlog – S2-TASK-01  
“Local SQLite Cache with Encryption & Redux Re-Hydration”

Overall Epic Goal  
Give the Channel-Partner mobile app an encrypted, on-device SQLite cache (SQLCipher) that is populated by the API layer and automatically re-hydrates Redux so key data (Leads / Quotations / Customers) is available during offline cold starts.

────────────────────────────────────────
SUB-TASK 1 – Library Setup & Native Linking (2 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • react-native-sqlcipher-storage is added to package.json.  
   • iOS pod-install succeeds and Android builds without manual edits.  
   • An empty encrypted DB can be opened from JS without runtime errors.

2. Dependencies  
   – None (first task).

3. Implementation Approach  
   a. Add dependency + exact version pin in package.json.  
   b. Run pod-install / gradle sync; commit generated Podfile.lock & pods workspace.  
   c. Update android/app/build.gradle with `ndk { abiFilters "armeabi-v7a","arm64-v8a","x86","x86_64" }` if missing to prevent 64-bit exclusion warnings.  
   d. Verify metro config does not require extra assetExts.  

4. New Code Artifacts  
   • (None – build-system only)

5. Expected Outputs  
   • CI pipeline “android” & “ios” lanes compile successfully.  

6. Testing Requirements  
   • Jest not applicable; run `yarn ios` / `yarn android` in CI smoke job.

7. Additional Specs  
   • Version pin in package.json comments must reference ADR-0005 (to be written later) to justify SQLCipher choice.


────────────────────────────────────────
SUB-TASK 2 – Encryption-Key Generation & Storage (3 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • A 64-byte random key (hex) is generated on first launch only.  
   • Key is stored in OS Keychain/Keystore under service “SolariumCP-SQLCipher”.  
   • Subsequent launches re-use the same key; deleteToken clears DB key too.  

2. Dependencies  
   – Sub-task 1 complete.  
   – Keychain helper already present (KeychainHelper.ts).

3. Implementation Approach  
   a. Create new util `SQLiteKeyHelper.ts` that wraps react-native-keychain.  
   b. Expose `getDbKey(): Promise<string>` and `resetDbKey(): Promise<void>`.  
   c. Generate key via `react-native-get-random-values` (already transitively in RN).  
   d. Extend existing `performLogout()` thunk to call `resetDbKey` (clears cache on logout).

4. New Code Artifacts  
   • src/utils/secureStorage/SQLiteKeyHelper.ts  
     –  export async function getDbKey(): Promise<string>;  
     –  export async function resetDbKey(): Promise<void>;

5. Expected Outputs  
   • Unit tests show same key returned across calls, new key after reset.  

6. Testing Requirements  
   • 90 %+ coverage for key helper (mock Keychain).  
   • Security: jest test asserts key length == 128 hex chars.

7. Additional Specs  
   • Never log key; default log level must redact.



────────────────────────────────────────
SUB-TASK 3 – Database Bootstrap & Schema Migration (4 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • Opening DB with key automatically creates schema version 1.  
   • Tables: Leads, Quotations, Customers, SyncMetadata exactly match D-ART-036.  
   • Migration runner upgrades v0→v1 idempotently, stores user_version pragma.  

2. Dependencies  
   – Sub-task 2 for key.  

3. Implementation Approach  
   a. New module `src/database/database.ts`  
      • export async function openEncryptedDb(): Promise<SQLiteDatabase>;  
      • Internally pulls key via getDbKey().  
   b. New `src/database/schema.ts` with DDL strings & currentVersion = 1.  
   c. New `src/database/migrations.ts` with `runMigrations(db,currentVersion)`.  
   d. Call migration runner inside openEncryptedDb() on first open.  

4. New Code Artifacts  
   • database.ts  
   • schema.ts  
   • migrations.ts  

5. Expected Outputs  
   • Jest “open→pragma user_version” == 1.  
   • DB file appears under `Library/LocalDatabase/solarium.db` (iOS) or `databases` (Android).

6. Testing Requirements  
   • DAO tests spin up temp DB file with random name to avoid collisions.  
   • Coverage ≥ 85 % for database layer.

7. Additional Specs  
   • Use WAL mode for performance (`PRAGMA journal_mode=WAL`).  



────────────────────────────────────────
SUB-TASK 4 – BaseDao & Entity DAO Implementations (4 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • BaseDao exposes `upsertAll`, `findAll`, `findById`, `deleteAll`.  
   • Specific DAO classes for Leads, Quotations, Customers, SyncMetadata inherit BaseDao.  
   • upsertAll within a single transaction.  
   • Unit tests cover happy path & SQL errors (mock).  

2. Dependencies  
   – Sub-task 3 database module.  

3. Implementation Approach  
   a. Create `src/database/dao/BaseDao.ts`.  
   b. Create DAO files: LeadDao.ts, QuotationDao.ts, CustomerDao.ts, SyncDao.ts.  
   c. Each DAO exports singleton via `getInstance(db)`.  
   d. Add TypeScript interfaces for entities identical to future API DTOs to avoid mapping churn.  

4. New Code Artifacts  
   • dao/BaseDao.ts  
   • dao/LeadDao.ts  
   • dao/QuotationDao.ts  
   • dao/CustomerDao.ts  
   • dao/SyncDao.ts  
   • models/Lead.ts (export interface Lead)  
   • models/Customer.ts (export interface Customer)

5. Expected Outputs  
   • Jest inserts 1 000 rows in <150 ms (WAL mode).  

6. Testing Requirements  
   • Tests under `__tests__/database/LeadDao.test.ts` etc.  
   • Simulate constraint violation, expect Promise reject.  

7. Additional Specs  
   • All queries use `?` placeholders to avoid SQL injection.



────────────────────────────────────────
SUB-TASK 5 – Redux-Persist SQLite Transform (3 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • leadSlice and customerSlice are created with explicit, strictly-typed state interfaces (`LeadState`, `CustomerState`) containing at minimum `items: Lead[] | Customer[]`, `lastSync: number | null`, and `isLoading: boolean`.  
   • A custom transform loads Leads/Quotations/Customers from DAO during the REHYDRATE phase and populates the new slices.  
   • Persist path whitelist updated to include new slices but NOT large lists (AsyncStorage quota).  
   • Re-hydrate latency measured <500 ms for 1 000 lead rows on mid-tier Android.  

2. Dependencies  
   – Sub-task 4 (DAO), existing Redux store scaffold.

3. Implementation Approach  
   a. Create `src/store/slices/leadSlice.ts` and `src/store/slices/customerSlice.ts`  
      • Define `interface LeadState`, `interface CustomerState`, `initialState`, and reducers `setItems`, `clear`.  
   b. Export types `Lead` and `Customer` from models (added in Sub-task 4) for slice use.  
   c. Register the new slices in `src/store/index.ts` and update `RootState` type.  
   d. Add custom transform factory `createSQLiteTransform` at `src/store/transforms/sqliteTransform.ts`; include in `persistConfig.transforms`.  
   e. `sqliteTransform.inbound` → NO-OP (never write large data to AsyncStorage).  
      `sqliteTransform.outbound` → open DB, query DAOs, and populate slices’ `items` & `lastSync`.  
   f. Update Jest coverage thresholds if file count changes (keep global ≥80 %).  

4. New Code Artifacts  
   • src/store/slices/leadSlice.ts  
   • src/store/slices/customerSlice.ts  
   • src/store/transforms/sqliteTransform.ts  

5. Expected Outputs  
   • Cold-start offline renders HomeScreen with non-zero counts if cache exists.  

6. Testing Requirements  
   • Unit tests for each slice (initialState, reducer actions).  
   • Integration test `__tests__/integration/reduxSQLiteRehydrate.test.ts`  
     – Pre-seed DB, mount store, expect `state.leads.items.length === preSeedCount`.  

7. Additional Specs  
   • Transform must be stateless; avoid memory leaks by closing DB after read.



────────────────────────────────────────
SUB-TASK 6 – App Bootstrap Wiring (2 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • New <DatabaseProvider> completes DB open + migrations before <NavigationProvider>.  
   • AuthBootstrap waits for both DB and Keychain bootstrap (Promise.all).  

2. Dependencies  
   – Sub-task 3 openEncryptedDb.  

3. Implementation Approach  
   a. Create context provider `src/database/DatabaseProvider.tsx`.  
   b. Wrap inside App.tsx hierarchy:  
      `<Provider store>` → `<PersistGateProvider>` → `<ConnectivityProvider>` → `<DatabaseProvider>` → `<ErrorBoundary>` …  
   c. Provide `useDatabase()` hook for later features.  

4. New Code Artifacts  
   • DatabaseProvider.tsx  
   • hooks/useDatabase.ts  

5. Expected Outputs  
   • No white-screen flicker; SplashScreen hides after DB ready.  

6. Testing Requirements  
   • RTL test mounts App and asserts provider value not undefined.



────────────────────────────────────────
SUB-TASK 7 – DAO & Transform Test Suite (3 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • Overall coverage ≥ 80 %, DAO modules ≥ 85 %.  
   • Jest tests prove:  
     – Cannot open DB without correct key (expect error).  
     – upsertAll + findAll round-trip.  
     – Rehydrate performance (<500 ms) recorded via Jest timers.  

2. Dependencies  
   – Sub-tasks 2–5.  

3. Implementation Approach  
   a. Extend jest.setup.ts to mock timer for perf test.  
   b. Add new test folder `__tests__/database`.  

4. New Code Artifacts  
   • __tests__/database/… files.  

5. Expected Outputs  
   • CI “test” job passes with new thresholds intact.



────────────────────────────────────────
SUB-TASK 8 – Security & Performance Verification Script (2 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • Script demonstrates sqlite3 CLI fails to open DB file (wrong key).  
   • Lighthouse-style benchmark logs rehydrate wall-time for 1 k rows (<500 ms).  

2. Dependencies  
   – Sub-tasks 3 & 5.  

3. Implementation Approach  
   a. Add Node script `scripts/check-db-security.js` executed in CI optional step.  
   b. Use `child_process.exec("sqlite3 … 'PRAGMA integrity_check;'")` expect non-zero exit.  
   c. Perf benchmark inside Jest run (already above).  

4. New Code Artifacts  
   • scripts/check-db-security.js  

5. Expected Outputs  
   • CI log lines: “DB locked — OK”.  



────────────────────────────────────────
SUB-TASK 9 – Documentation & ADR (2 pts)
────────────────────────────────────────
1. Acceptance Criteria  
   • New ADR-0005 “Encrypted SQLite Cache Layer” committed.  
   • README Offline-Cache section added with developer instructions.  
   • docs/adr updated nav list.  

2. Dependencies  
   – Complete after at least Sub-task 3.  

3. Implementation Approach  
   a. Follow existing ADR template.  
   b. Document perf numbers, security rationale, migration strategy.  
   c. Update CONTRIBUTING.md outlining the “clear DB cache” yarn script.  

4. New Code Artifacts  
   • docs/adr/ADR-0005-sqlcipher-cache.md  



────────────────────────────────────────
CROSS-TASK NOTES
────────────────────────────────────────
• All new TypeScript files must use strict types (`"strict": true` already in tsconfig).  
• Error handling: wrap DAO ops in try/catch, log via existing errorMiddleware logger when called from thunks (future).  
• Lint/Prettier hooks already auto-run.  
• SonarQube gate inherits jest coverage; DAO SQL strings ignored via `/* istanbul ignore next */` when inevitable.  
• Performance: use single shared DB connection via DatabaseProvider context; close only on app unmount or logout.  
• Security: disable SQLCipher plaintext_header; pragma cipher_hmac_algo = ‘SHA512’.