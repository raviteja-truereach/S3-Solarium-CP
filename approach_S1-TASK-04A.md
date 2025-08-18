====================================================================
Implementation Backlog – S1-TASK-04A  “Secure OTP Auth – Backend Integration & Token Storage”
Component(s): CPAPP-AUTH, CPAPP-STATE  
Epic/Theme: Mobile Authentication MVP
====================================================================

--------------------------------------------------------------------
GLOBAL DEPENDENCIES (apply to every sub-task)  
• Backend endpoint `/api/v1/auth/login` reachable from device / emulator  
• Library react-native-keychain (^9.x) linked for iOS & Android  
• CI image caches updated (Android NDK 25 required by Keychain)  
• Jest config already present (no change)  
• New constants file `src/constants/auth.ts` exports  
  – `OTP_RESEND_INTERVAL = 30` • `OTP_EXPIRY_SEC = 120`
--------------------------------------------------------------------

SUB-TASK ST04A-1  – “Keychain Helper” (2 SP)  
Purpose: Persist / retrieve / delete JWT securely at OS level.

1. Acceptance Criteria  
   a. `saveToken()` persists {token, expiresAt:number} in Keychain.  
   b. `getToken()` returns undefined if no record or if expired (< Date.now).  
   c. `deleteToken()` reliably removes the record.  

2. Dependencies  
   • react-native-keychain installed & linked  

3. Implementation Approach  
   i.  Install lib & configure Podfile / gradle (set `android:allowBackup="false"` & `userEncryptedKeys=true`).  
   ii. Create thin wrapper around Keychain API.  
   iii. Use `JSON.stringify` for payload, set `accessible: WHEN_UNLOCKED`.  

4. New Code Artifacts  
   • src/utils/secureStorage/KeychainHelper.ts  
     - `export async function saveToken(token: string, exp: number): Promise<void>`  
     - `export async function getToken(): Promise<{token:string;exp:number}|undefined>`  
     - `export async function deleteToken(): Promise<void>`  

5. Expected Outputs  
   • Helper file committed; manual test in demo script returns token.  

6. Testing Requirements  
   • Unit tests (__tests__/utils/KeychainHelper.test.ts) mocking Keychain.  
   • Coverage ≥ 90 % lines for helper.  

7. Additional Specs  
   • Catch and swallow platform “UserCanceled” error; return undefined.  

--------------------------------------------------------------------
SUB-TASK ST04A-2  – “authSlice V2 & Bootstrap” (3 SP)  

1. Acceptance Criteria  
   a. authSlice fields: token, expiresAt, isLoggedIn, user {id, phone}.  
   b. On app launch, redux-persist rehydration runs `bootstrapFromKeychain()`.  
   c. Valid token dispatches `bootstrapSuccess`; expired/empty dispatches `tokenExpired`.  

2. Dependencies  
   • ST04A-1 complete.  

3. Implementation Approach  
   i.  Extend existing “authSlice” (src/store/slices/authSlice.ts).  
   ii. Add thunk `bootstrapFromKeychain()` in src/store/thunks/authThunks.ts.  
   iii. Invoke thunk in App.tsx before `<NavigationProvider>`.  

4. New Artifacts  
   • src/store/thunks/authThunks.ts  
     - `export const bootstrapFromKeychain(): AppThunk`  
   • authSlice: add reducers `bootstrapSuccess`, `tokenExpired`.  

5. Expected Outputs  
   • App bypasses AuthStack if token still valid at startup.  

6. Testing Requirements  
   • Reducer tests for new actions.  
   • Integration test: mock Keychain → expect navigation to Main.  

--------------------------------------------------------------------
SUB-TASK ST04A-3 – “Auth RTK Endpoints & Header Injection” (3 SP)

1. Acceptance Criteria  
   a. `requestOtp` mutation POSTs `{phone}` returns `{otpSent:true}`.  
   b. `verifyOtp` mutation POSTs `{phone, otp}` returns `{token, role, expiresIn}`.  
   c. All subsequent baseQuery calls attach header `Authorization: Bearer <token>`.  
   d. 401 response or locally-expired token triggers `performLogout()`.  

2. Dependencies  
   • ST04A-1 (Keychain helper)  

3. Implementation Approach  
   i.  Create src/store/api/authApi.ts extending baseApi with two mutations.  
   ii. Update customBaseQuery (src/store/api/baseQuery.ts) to:  
       – read token from redux; if absent, fallback Keychain once at launch.  
       – skip attaching header when token is undefined or expired.  
       – on 401 → dispatch logout thunk.  
   iii. Confirm middleware order (`baseApi.middleware` before errorMiddleware).  

4. New Artifacts  
   • src/store/api/authApi.ts  
     - endpoints: `requestOtp`, `verifyOtp`.  
   • src/store/api/baseQuery.ts (updated util `attachAuthHeader`).  

5. Expected Outputs  
   • Network inspector shows header present after login.  

6. Testing Requirements  
   • Mock fetch tests in __tests__/store/api/authApi.test.ts.  
   • Ensure 401 path dispatches logout.  

--------------------------------------------------------------------
SUB-TASK ST04A-4 – “OTP Login UI & Flow” (4 SP)  

1. Acceptance Criteria  
   a. LoginScreen: phone input → “Get OTP” button.  
   b. After `requestOtp` success → OtpScreen with 2-minute countdown.  
   c. User can resend after 30 s; max 5 attempts – server lock (“Locked for 15 minutes”) displayed with countdown.  
   d. Successful verification navigates to MainTab.  

2. Dependencies  
   • ST04A-3 endpoints ready.  

3. Implementation Approach  
   i.  Replace placeholder LoginScreen.tsx with real implementation.  
   ii. Create src/screens/auth/OtpScreen.tsx using `react-native-otp-inputs`.  
   iii. Use RTK hooks `useRequestOtpMutation`, `useVerifyOtpMutation`.  
   iv. Local state tracks resend timer & attempts; show accessibility labels.  

4. New Artifacts  
   • src/screens/auth/OtpScreen.tsx  
   • navigation/AuthStack.tsx – add “Otp” route.  

5. Expected Outputs  
   • Manual flow works end-to-end with backend.  

6. Testing Requirements  
   • Component tests: timer, resend disabled until 30 s.  
   • Integration test with mocked server – happy + lock-out cases.  

7. Additional Specs  
   • Accessibility: OTP inputs `accessibilityLabel="OTP-digit-{n}"`.  

--------------------------------------------------------------------
SUB-TASK ST04A-5 – “Login Success & Logout Workflow” (2 SP)

1. Acceptance Criteria  
   a. On verifyOtp success:  
      • `saveToken(token, now + expiresIn)` (Keychain)  
      • dispatch `loginSuccess`  
      • navigate to Main  
   b. “Logout” in Settings clears Keychain & redux, returns to Splash.  

2. Dependencies  
   • ST04A-1,2,3 completion.  

3. Implementation Approach  
   i.  Add thunk `performLogout()` in authThunks.ts (reuses `deleteToken`).  
   ii. Update SettingsScreen `handleLogout` → performLogout.  
   iii. Ensure NavigationProvider already listens to auth state change.  

4. New Artifacts  
   • None (modify existing files only).  

5. Expected Outputs  
   • After logout app shows Splash → Login again.  

6. Testing Requirements  
   • Reducer test verifies state cleared.  
   • Optional Detox E2E (added to backlog but not sprint-blocking).  

--------------------------------------------------------------------
SUB-TASK ST04A-6 – “Comprehensive Test Suite & CI Gates” (3 SP)

1. Acceptance Criteria  
   a. Jest coverage ≥ 80 % overall, ≥ 85 % auth logic.  
   b. All new helper, slice, thunk, API endpoint tests green.  
   c. Mocks for Keychain & fetch do not leak globals.  

2. Dependencies  
   • All prior sub-tasks merged.  

3. Implementation Approach  
   i.  Add jest mocks: __mocks__/react-native-keychain.js.  
   ii. Write unit tests for:  
       – KeychainHelper  
       – authSlice reducers  
       – authThunks login/logout  
       – authApi happy / 401 paths  
   iii. Update sonar-project.properties if new dirs added.  

4. New Artifacts  
   • __tests__/store/thunks/authThunks.test.ts  
   • __tests__/screens/auth/OtpScreen.test.tsx  

5. Expected Outputs  
   • `yarn test` passes locally and in CI.  
   • Coverage badges auto-updated by existing script.  

6. Testing Requirements  
   • Follow Given-When-Then assertions; include edge cases for expiry & lock-out.  

--------------------------------------------------------------------
SCHEDULE & ORDER OF EXECUTION  

1. ST04A-1 → 2 → 3 → 4 → 5 → 6  
   (Each subsequent sub-task blocked by previous as listed in Dependencies)  

--------------------------------------------------------------------
NOTES & SPECIAL CONSIDERATIONS  

• Security: Never log OTP, JWT or Keychain errors.  
• Performance: Keychain reads are async – cache token in Redux after bootstrap to avoid per-request I/O.  
• Error handling: Show server message if `error.code === 401 && message.includes('Invalid OTP')`.  
• Lock-out UX: If backend returns `{error:{code:429,message:'Locked'}}`, LoginScreen shows countdown mm:ss until retry.  
• Accessibility: Ensure all inputs have labels; LoginScreen auto-focuses first invalid field.  
• Config constants centralised in `src/constants/auth.ts`.  
• Compliance: Token retention strictly 24 h with no refresh route; aligns with L3-IB-CPAPP override.  

--------------------------------------------------------------------
EXPECTED DELIVERABLES  

• All new source & test files compile on iOS + Android.  
• Updated documentation: docs/ADR/ADR-0003-mobile-otp-auth.md (design rationale).  
• Changelog entry under “Added – Secure OTP Auth”.  

--------------------------------------------------------------------
END OF IMPLEMENTATION BACKLOG
--------------------------------------------------------------------