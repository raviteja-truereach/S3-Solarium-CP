Implementation Backlog – S1-TASK-04B  
Secure OTP Auth – UI Flow & Navigation Hook‐up (CPAPP)

General notes  
• All sub-tasks are sized 2-4 SP, INVEST-compliant and independently mergeable.  
• Coding MUST follow existing patterns: React-Native 0.71 (TypeScript), Redux Toolkit, RTK Query, react-native-paper.  
• New files / functions listed below include full relative paths (root = SOLARIUM-CPAPP).  
• All new logic must reach ≥ 80 % overall / 85 % business-logic coverage; E2E tests run via Detox (config exists in root fastlane).  

------------------------------------------------------------------
Sub-Task ST-1  “Wire Real OTP Request in LoginScreen”  (3 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. When online & valid phone entered, pressing “Get OTP” calls backend POST /api/v1/auth/login with body { phone }.  
  b. Success (otpSent = true) navigates to OtpScreen with phone param.  
  c. HTTP 4xx/5xx and offline states surface via errorMiddleware toast; “Get OTP” button disabled when offline.  
  d. Unit test: mock server 200 → navigation invoked; mock 429 → lock-out toast displayed.

2. Dependencies: none (can start immediately).

3. Implementation Approach  
  – Un-comment existing useRequestOtpMutation code lines (LoginScreen.tsx lines 27-66 & 156-160) and remove temporary mock navigation block (86-95).  
  – Re-use ConnectivityContext for offline detection.  
  – Ensure request respects API_RETRY_COUNT (handled by customBaseQuery).  
  – Leverage existing utils/errorMessage.ts for friendly error text (add helper there—see New Code Artifacts).  

4. New Code Artifacts  
  • (UPDATE) src/screens/auth/LoginScreen.tsx – enable real flow.  
  • (UPDATE) src/utils/errorMessage.ts – add `export function validateBackendError(error: FetchBaseQueryError): string` (returns friendly string for toast; re-used by LoginScreen and errorMiddleware).  

5. Expected Output  
  • Users reach OtpScreen only after server confirms OTP.  

6. Testing Requirements  
  • Unit: __tests__/screens/auth/LoginScreen.test.tsx updated to cover success & failure cases.  
  • Integration: update authFlow.integration.test.ts to hit mocked endpoint via msw.  

------------------------------------------------------------------
Sub-Task ST-2  “Wire Real OTP Verification in OtpScreen”  (3 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. With 6-digit OTP, POST /api/v1/auth/login { phone, otp } invoked via verifyOtp mutation.  
  b. On success (token, role, userId), token saved to Keychain, loginSuccess dispatched, navigation automatically routes to MainTab.  
  c. 401/400 errors decrement attempts; lock-out after 5 failed tries (15 min); UX unchanged.  
  d. Token expires in 24 h as enforced by KeychainHelper.

2. Dependencies: ST-1 (phone captured).

3. Implementation Approach  
  – Un-comment verifyOtp mutation code (OtpScreen.tsx lines 50, 114-193) and delete mock block (195-254).  
  – Await KeychainHelper.saveToken before dispatch(loginSuccess) to avoid race.  
  – Keep timers / offline handling intact.

4. New Code Artifacts  
  • (UPDATE) src/screens/auth/OtpScreen.tsx – enable real verification flow.  
  • (NEW TEST) __tests__/screens/auth/OtpScreen.test.tsx – success & lock-out scenarios.

5. Expected Output  
  • Real backend verifies OTP; app lands on Home (MainTabNavigator).

6. Testing Requirements  
  • Unit & integration tests similar to ST-1 (jest + msw mocks).

------------------------------------------------------------------
Sub-Task ST-3  “AuthGuard Component & Navigation Protection”  (4 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. Un-authenticated users can only access AuthStack routes.  
  b. Authenticated users are redirected to MainTab; navigating back to Auth routes logs them out.  
  c. Deep links respect guard (e.g., solariumcp://main triggers guard logic).

2. Dependencies: ST-2 (token established).

3. Implementation Approach  
  – Create reusable <AuthGuard> that subscribes to authSlice.isLoggedIn.  
  – Replace ternary logic in NavigationProvider (lines 56-72) with AuthGuard wrapper.  
  – Prop `requiresAuth?: boolean` (default = false) decides redirect target to “Auth” or “Main”.

4. New Code Artifacts  
  • src/components/auth/AuthGuard.tsx  
    – export interface AuthGuardProps { requiresAuth?: boolean; children: React.ReactNode }  
    – Uses react-navigation hooks to redirect without remount loops.  
  • (UPDATE) src/navigation/NavigationProvider.tsx – integrate AuthGuard.

5. Expected Output  
  • Navigation automatically reacts to auth state across cold start, logout, and deep links.

6. Testing Requirements  
  • Unit: AuthGuard renders correct child based on mocked store.  
  • Integration: authWorkflow.integration.test.ts – bootstrapFromKeychain path redirect.

------------------------------------------------------------------
Sub-Task ST-4  “Secure-Screen Flag for Sensitive Screens”  (2 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. Android: FLAG_SECURE set while LoginScreen & OtpScreen are focused; cleared on blur/unmount.  
  b. iOS: App detects `isScreenCaptured` (via react-native-device-info) and overlays warning banner when true.  
  c. Behaviour unit-tested with Jest mocks for NativeModules.WindowManager & DeviceInfo.

2. Dependencies: none (parallel).

3. Implementation Approach  
  – Create helper `src/utils/screenSecurity.ts`  
    • `export async function setSecure(flag: boolean): Promise<void>` (Android only).  
    • `export function addScreenCaptureListener(cb: (captured: boolean) => void): () => void` (iOS).  
  – Add `src/components/common/ScreenCaptureWarning.tsx` (Paper Snackbar overlay shown when captured = true).  
  – In LoginScreen & OtpScreen useFocusEffect to engage setSecure(true) on focus and setSecure(false) on blur; start/stop iOS listener.  
  – Warning banner rendered conditionally using new component.

4. New Code Artifacts  
  • src/utils/screenSecurity.ts  
  • src/components/common/ScreenCaptureWarning.tsx  
  • (UPDATE) src/screens/auth/LoginScreen.tsx & OtpScreen.tsx – integrate helper.

5. Expected Output  
  • Screenshots disabled on Android; capture alert shown on iOS during screen recording or mirrored display.

6. Testing Requirements  
  • Jest mocks for screen security native APIs; snapshot tests for banner presence.

------------------------------------------------------------------
Sub-Task ST-5  “Detox E2E Happy-Path & Lock-out Scenarios”  (4 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. Test logs in with valid phone/OTP → lands on Home → sees “Home” title.  
  b. Second test enters wrong OTP 5 times → lock-out banner visible, verify button disabled.  
  c. Runs green on Android emulator & iOS simulator in CI (GitHub Actions workflow updated).

2. Dependencies: ST-1, ST-2, ST-3 (real flow must exist).

3. Implementation Approach  
  – Add E2E tests: e2e/loginSuccess.e2e.ts & e2e/otpLockout.e2e.ts.  
  – Use existing local mock server (fastlane lane DETOX_MOCK=1) for network stubbing.  
  – Extend package.json detox config; update scripts/test-e2e*.  

4. New Code Artifacts  
  • e2e/loginSuccess.e2e.ts  
  • e2e/otpLockout.e2e.ts  
  • .github/workflows/detox.yml (or modify existing mobile-ci.yaml)

5. Expected Output  
  • CI publishes green check + Detox artifacts (screenshots, logs).

6. Testing Requirements  
  • Detox coverage reported; scripts/ci updated to gate merge.

------------------------------------------------------------------
Sub-Task ST-6  “Documentation & ADR Update”  (2 SP)
------------------------------------------------------------------
1. Acceptance Criteria  
  a. ADR-0004-auth-guard.md added under docs/adr explaining navigation guard decision.  
  b. README login section updated to describe real backend flow & secure-screen note.  
  c. Sprint-progress file appended with ST-04B summary.

2. Dependencies: ST-3 & ST-4 (content).

3. Implementation Approach  
  – Write ADR in the established template (status “Accepted”).  
  – Update docs/ci-cd-pipeline.md to mention Detox lane.  

4. New Code Artifacts  
  • docs/adr/ADR-0004-auth-guard.md  
  • README.md amendments.

5. Expected Output  
  • Up-to-date documentation; lint-markdown passes.

6. Testing Requirements  
  • markdownlint, docs validation script.

------------------------------------------------------------------
Cross-Task Testing Matrix
------------------------------------------------------------------
Unit (Jest): ST-1, ST-2, ST-3, ST-4  
Integration (Jest + msw mocks): ST-1, ST-2, ST-3  
E2E (Detox): ST-5  
Static Analysis: ESLint / Prettier gates on every PR  
Coverage targets validated in CI badge script.

------------------------------------------------------------------
Overall Deliverables
------------------------------------------------------------------
✓ Functional OTP registration/login fully wired to backend  
✓ AuthGuard ensures proper routing & deep-link safety  
✓ Secure-screen measures in place on sensitive screens  
✓ E2E automated tests prove happy path & lock-out UX  
✓ Updated documentation + new ADR  

Completion of all sub-tasks satisfies S1-TASK-04B acceptance criteria and readies CPAPP-AUTH for production usage.