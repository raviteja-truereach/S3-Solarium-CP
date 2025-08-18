## Pre-Analysis Phase

Based on the current codebase analysis, I've identified the following relevant patterns and components to leverage:

### Existing Patterns to Reuse:
- **RTK Query API pattern**: Found in `leadApi.ts`, `authApi.ts` - use similar structure for document API
- **Error handling**: `errorMiddleware.ts` and `validateBackendError` utility for consistent error messages
- **Network connectivity**: `ConnectivityContext` for online/offline checks
- **Document management**: Existing `documentCountSlice.ts`, `useDocumentPicker.ts`, and validation schemas
- **Progress tracking**: Similar pattern needed as in `SyncManager.ts` for upload progress
- **Toast notifications**: Existing `Toast.show()` patterns throughout the app

### Key Integration Points:
- `DocumentUploadScreen` already exists but needs upload functionality enabled
- `SyncManager` can be extended for document cache invalidation
- Existing document validation and compression utilities
- Redux persist infrastructure for offline document metadata

## Top 5 Implementation Pitfalls

1. **Automatic Retry Implementation**: Developers might implement automatic retries on failure, but requirements explicitly state manual retry only. This could lead to unexpected behavior and token exhaustion.

2. **SAS Token Expiry Handling**: Not properly handling the 5-minute token expiry window. Upload attempts after expiry will fail silently if not caught properly.

3. **Progress Tracking Race Conditions**: Implementing progress callbacks that update state too frequently, causing UI jank or crashes on rapid state updates.

4. **Improper Error State Management**: Not clearing error states between retry attempts or mixing upload errors with validation errors, leading to confusing user experience.

5. **Cache Synchronization Issues**: Forgetting to update both Redux state and SQLite cache after successful upload, causing inconsistency between offline and online states.

---

## Implementation Backlog

### Sub-task 1: Create Document API Service Layer (3 points)

**Acceptance Criteria:**
- RTK Query API endpoints for requesting SAS tokens are created and functional
- API handles both KYC and Lead document token requests
- Proper error handling with typed responses
- API slice is properly integrated into Redux store with reducer and middleware

**Dependencies:**
- Existing `baseQuery.ts` and API infrastructure
- Document types from `src/types/document.ts`

**Implementation Approach:**
1. Create new RTK Query API slice following existing patterns
2. Define typed request/response interfaces for SAS token endpoints
3. Implement two endpoints: `getKycSasToken` and `getLeadDocSasToken`
4. Add proper error transformation using existing error utilities
5. Register documentApi reducer and middleware in `src/store/index.ts`
6. Add serializable check ignore actions for documentApi in store configuration

**New Code Artifacts:**
- **Files:**
  - `src/store/api/documentApi.ts` - RTK Query API for document operations
  - `src/types/api/document.ts` - Type definitions for document API requests/responses
- **Functions:**
  - `documentApi.endpoints.getKycSasToken(builder.mutation)` - Mutation for KYC SAS token
  - `documentApi.endpoints.getLeadDocSasToken(builder.mutation)` - Mutation for lead doc SAS token
  - `documentApi.endpoints.getDocumentsByLead(builder.query)` - Query to fetch documents for a lead
  - `transformSasResponse(response: any): SasTokenResponse` - Transform API response

**Expected Outputs:**
- Functional API endpoints that can request SAS tokens
- Proper TypeScript types for all API interactions
- Integration with existing Redux store
- Document list refresh capability

**Testing Requirements:**
- Unit tests mocking successful SAS token responses
- Error scenario tests (401, 500, network failure)
- Type safety tests ensuring proper request/response shapes
- Test store integration (reducer and middleware registration)
- Coverage target: 85%+ for API logic

**Additional Specifications:**
- Use existing `customBaseQuery` from `baseQuery.ts`
- Follow error handling patterns from `authApi.ts`
- Ensure proper JWT token attachment for authenticated requests
- Add invalidation tags for document list caching

---

### Sub-task 2: Implement File Upload Service with Progress Support (4 points)

**Acceptance Criteria:**
- File upload to Azure Blob using SAS URL works correctly
- Progress tracking updates smoothly (0-100%) using XMLHttpRequest
- Upload can be cancelled mid-flight
- Single attempt only (no automatic retries)
- Explicit SAS expiry error handling with clear error messages

**Dependencies:**
- Sub-task 1 (API endpoints for SAS tokens)
- Existing document types and validation

**Implementation Approach:**
1. Create upload service module using XMLHttpRequest for progress tracking
2. Implement PUT request to Azure Blob with progress callbacks via `upload.onprogress`
3. Add cancellation support using XMLHttpRequest.abort()
4. Create upload state management for progress/status
5. Implement specific error detection for SAS expiry (403 Forbidden)

**New Code Artifacts:**
- **Files:**
  - `src/services/DocumentUploadService.ts` - Core upload logic with progress
  - `src/hooks/useDocumentUpload.ts` - React hook for upload state management
- **Functions:**
  - `uploadToBlob(file: DocumentAsset, sasUrl: string, onProgress: (percent: number) => void, abortSignal?: AbortSignal): Promise<void>` - Main upload function using XMLHttpRequest
  - `createXHRUpload(file: DocumentAsset, sasUrl: string): XMLHttpRequest` - Create configured XMLHttpRequest
  - `detectSasExpiryError(xhr: XMLHttpRequest): boolean` - Detect SAS token expiry from response
  - `useDocumentUpload(): DocumentUploadHook` - Hook returning upload state and controls
  - `calculateProgress(loaded: number, total: number): number` - Progress calculation with throttling

**Expected Outputs:**
- Working file upload with smooth progress updates via XMLHttpRequest
- Cancellable uploads
- Proper error propagation for failed uploads
- Specific SAS expiry error detection

**Testing Requirements:**
- Mock Azure Blob upload responses
- Test progress callback updates with XMLHttpRequest
- Test cancellation scenarios
- Test SAS expiry detection (403 response)
- Test large file uploads (edge cases)
- Coverage target: 80%+

**Additional Specifications:**
- Use XMLHttpRequest API for upload (not fetch) to enable progress tracking
- Implement throttled progress updates (max every 100ms) to prevent UI lag
- Handle CORS and Azure-specific headers properly
- Detect SAS expiry via 403 status code and specific error response

---

### Sub-task 3: Integrate Upload Flow with Server State Verification (4 points)

**Acceptance Criteria:**
- Upload button is enabled when online and documents are selected
- Document count is fetched from server before upload to prevent race conditions
- Progress bar shows during upload with accurate percentage
- Error states display with retry button on failure
- Success state refreshes document list from backend and updates local cache
- Clear error boundary handling for upload errors

**Dependencies:**
- Sub-task 1 (API endpoints)
- Sub-task 2 (Upload service)
- Existing `DocumentUploadScreen.tsx`

**Implementation Approach:**
1. Enable upload button based on connectivity and selection state
2. Implement pre-upload server document count check
3. Implement upload flow orchestration in DocumentUploadScreen
4. Add progress UI components with smooth animations
5. Implement retry button with full state reset
6. Add error boundary component for upload errors
7. Fetch updated document list from backend after successful upload

**New Code Artifacts:**
- **Files:**
  - `src/components/documents/UploadProgressBar.tsx` - Progress visualization component
  - `src/components/documents/UploadErrorState.tsx` - Error display with retry
  - `src/components/documents/DocumentUploadErrorBoundary.tsx` - Error boundary for upload flows
- **Functions:**
  - `handleUploadDocuments(): Promise<void>` in DocumentUploadScreen - Main upload orchestration with server checks
  - `verifyServerDocumentCount(): Promise<boolean>` in DocumentUploadScreen - Pre-upload count verification
  - `handleRetryUpload(): void` in DocumentUploadScreen - Manual retry handler with state reset
  - `resetUploadState(): void` in DocumentUploadScreen - Complete state cleanup
  - `refreshDocumentListFromServer(): Promise<void>` in DocumentUploadScreen - Backend list refresh
  - `UploadProgressBar({ progress, status }: ProgressProps): JSX.Element` - Progress component
  - `UploadErrorState({ error, onRetry }: ErrorProps): JSX.Element` - Error component with retry

**Expected Outputs:**
- Fully functional upload flow in UI with server verification
- Smooth progress updates
- Clear error messages with retry option
- Proper state management throughout upload lifecycle
- Backend-synced document list after upload

**Testing Requirements:**
- Component tests for progress bar and error states
- Integration tests for full upload flow including server checks
- Test SAS expiry → retry → success sequence
- Test document count limit enforcement (7 documents)
- Accessibility tests for screen reader announcements
- Test various network conditions
- Coverage target: 85%+

**Additional Specifications:**
- Use React Native Animated API for smooth progress
- Ensure upload continues when app is backgrounded (within reason)
- Follow existing error message patterns from `errorMessage.ts`
- Implement error boundary to catch and display upload errors gracefully

---

### Sub-task 4: Cache and State Synchronization (3 points)

**Acceptance Criteria:**
- Successful uploads update Redux documentCountSlice
- Document metadata persisted to SQLite
- Document list refreshes from backend after upload
- Offline capability for viewing uploaded documents
- Proper cache invalidation triggers backend refresh

**Dependencies:**
- Sub-task 3 (Upload flow completion)
- Existing SQLite DAOs and Redux slices

**Implementation Approach:**
1. Create or extend DAO for document metadata persistence
2. Update Redux state after successful upload
3. Implement cache invalidation in SyncManager
4. Ensure offline viewing of uploaded document metadata
5. Force backend refresh after cache invalidation

**New Code Artifacts:**
- **Files:**
  - `src/database/dao/DocumentDao.ts` - DAO for document metadata
  - `src/database/models/Document.ts` - Document model for SQLite
- **Functions:**
  - `DocumentDao.create(document: CreateDocumentRequest): Promise<Document>` - Save document metadata
  - `DocumentDao.findByLeadId(leadId: string): Promise<Document[]>` - Get documents for lead
  - `DocumentDao.bulkUpsert(documents: Document[]): Promise<void>` - Bulk update from server
  - `SyncManager.invalidateLeadDocuments(leadId: string): Promise<void>` - Cache invalidation with refresh
  - `refreshDocumentList(leadId: string): Promise<void>` in useDocumentCount - Backend fetch helper

**Expected Outputs:**
- Persisted document metadata viewable offline
- Synchronized Redux and SQLite states
- Updated document counts in UI
- Automatic backend refresh on cache invalidation

**Testing Requirements:**
- DAO unit tests with SQLite
- Redux state update tests
- Offline scenario tests
- Cache invalidation and refresh tests
- Test server state takes precedence over local
- Coverage target: 80%+

**Additional Specifications:**
- Follow existing DAO patterns from `LeadDao.ts`
- Ensure transactional updates for consistency
- Add to existing database migrations if needed
- Server state always overwrites local state (server-wins strategy)

---

### Sub-task 5: Server Limit Enforcement and Feature Flag (2 points)

**Acceptance Criteria:**
- Pre-upload server check prevents attempts when at 7-document limit
- 8th document upload attempt shows "Limit reached" error (409 response)
- Feature flag disables upload when backend unavailable
- Build-time configuration for feature flag
- Retry limit of 2 consecutive failures before forcing reset

**Dependencies:**
- All previous sub-tasks
- Existing config infrastructure

**Implementation Approach:**
1. Add feature flag to Config.ts
2. Implement conditional UI based on flag
3. Add pre-upload limit check from server
4. Handle 409 conflict response for limit exceeded
5. Implement retry counter with max 2 attempts
6. Add proper error messaging for all scenarios

**New Code Artifacts:**
- **Files:**
  - `src/config/Features.ts` - Feature flag configuration
- **Functions:**
  - `isDocumentUploadEnabled(): boolean` in Features.ts - Feature flag check
  - `handleDocumentLimitError(error: any): string` in errorMessage.ts - Limit error handler
  - `checkDocumentLimitBeforeUpload(leadId: string): Promise<boolean>` in documentApi - Pre-upload check
  - `trackRetryAttempt(): boolean` in useDocumentUpload - Retry counter (max 2)

**Expected Outputs:**
- Proper limit enforcement with clear messaging
- Ability to build app without upload feature
- Graceful degradation when backend unavailable
- Deterministic retry behavior (max 2 attempts)

**Testing Requirements:**
- Test limit enforcement scenarios
- Test feature flag on/off states
- Test error message display
- Test retry limit enforcement
- Coverage target: 80%+

**Additional Specifications:**
- Use build-time env variable for feature flag
- Follow existing error patterns
- Ensure UI remains functional with upload disabled
- Clear retry counter on successful upload or manual reset

---

### Sub-task 6: End-to-End Testing and Documentation (2 points)

**Acceptance Criteria:**
- Detox E2E test covers full upload flow including SAS expiry retry
- Jest tests achieve 80%+ coverage
- Documentation updated with new flows
- Explicit test cases for SAS token expiry and retry sequence

**Dependencies:**
- All implementation sub-tasks completed
- Existing test infrastructure

**Implementation Approach:**
1. Write comprehensive Detox test for upload flow
2. Add specific SAS expiry test scenario
3. Ensure Jest unit test coverage meets targets
4. Update relevant documentation
5. Add to manual test checklist

**New Code Artifacts:**
- **Files:**
  - `e2e/documentUpload.e2e.js` - Detox test for upload flow (update existing stub)
  - `e2e/documentUploadSasExpiry.e2e.js` - Specific SAS expiry test
  - `docs/document-upload-flow.md` - Technical documentation
- **Functions:**
  - Test scenarios in Detox files covering:
    - Success flow with progress tracking
    - SAS expiry → error → retry → new token → success
    - Network failure → retry
    - Document limit reached (409)
    - Retry limit exhaustion

**Expected Outputs:**
- Passing E2E tests in CI
- Coverage reports meeting targets
- Updated documentation
- SAS expiry scenario explicitly tested

**Testing Requirements:**
- Full upload flow E2E test
- SAS token expiry simulation (mock 403 on first attempt)
- Network failure scenarios
- Retry flow testing with state verification
- Document limit testing
- Performance benchmarks
- Coverage target: 80%+ overall

**Additional Specifications:**
- Follow existing Detox patterns
- Ensure tests run in CI pipeline
- Document any new environment setup needed
- Include manual QA checklist for SAS expiry testing