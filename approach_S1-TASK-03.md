Implementation Backlog – S1-TASK-03 “Network Layer, Connectivity & Global Error Handling”

Legend:  
CPAPP-STATE = Redux store / slices / RTK Query  CPAPP-SYNC = Networking / sync helpers  CPAPP-UI = Presentation layer

--------------------------------------------------------------------
EPIC: Provide a reusable network stack (timeout + single-retry + JWT) together with basic offline/error UX plumbing so that all future screens can consume secure REST APIs safely.

Sprint Capacity Target: ≤ 15 SP (5 dev days) Quality Gates: 80 % overall, ≥ 85 % business logic, ≤ 1.5 % duplication (Sonar)  
All new code MUST follow existing ESLint/Prettier rules and CI passes.

====================================================================
Sub-Task 1 – “ConnectivityContext & OfflineBanner”
--------------------------------------------------------------------
Story Points: 3  
Component(s): CPAPP-SYNC, CPAPP-UI

1. Acceptance Criteria  
   • App detects connectivity changes within ≤1 s; when offline `<OfflineBanner/>` slides into view at the top of the screen and hides within 500 ms after reconnection, with no runtime crashes (default context value `{isOnline: true}`).  
   • Banner text: “You’re offline. Some actions are disabled.” is i18n-ready via a string constant and meets a11y colour-contrast guidelines.  
   • Banner is globally visible across all navigators because `<ConnectivityProvider>` wraps `NavigationProvider` high in the component tree.

2. Dependencies  
   • `@react-native-community/netinfo` (already bundled with RN 0.71 pods – verify podspec).  
   • No dependency on other new sub-tasks.

3. Implementation Approach  
   a. Create `ConnectivityProvider` with a single NetInfo listener (`NetInfo.addEventListener`) and clean-up on unmount.  
   b. Expose `useConnectivity()` hook for consumers.  
   c. Build `<OfflineBanner/>` using `Animated.View` for slide-down/-up effect.  
   d. Add `<ConnectivityProvider>` in `App.tsx` (outermost after `<Provider>`).  
   e. Mount `<OfflineBanner/>` inside `NavigationProvider` so it overlays every screen.

4. New Code Artifacts  
   • `src/contexts/ConnectivityContext.tsx`  
     – `export const ConnectivityProvider: React.FC<{children: React.ReactNode}>`  
     – `export function useConnectivity(): { isOnline: boolean }`  
   • `src/components/common/OfflineBanner.tsx` – stateless component using `useConnectivity()`  
   • `src/constants/strings.ts` – add `export const OFFLINE_MESSAGE = "You’re offline. Some actions are disabled."`  
   • **Modifications**  
     – `App.tsx` – wrap tree with `<ConnectivityProvider>`  

5. Expected Outputs  
   • Banner appears when the simulator/device toggles airplane mode and disappears once re-connected.  
   • No memory leaks (listener removed on unmount).  

6. Testing Requirements  
   • Jest + @testing-library/react-native: mock NetInfo state changes → assert banner visibility.  
   • ≥ 90 % line coverage for `ConnectivityContext` & `OfflineBanner`.

7. Additional Specs  
   • Banner height = 32 dp, background `#FFCC00`, text `#000000`.  
   • Provider publishes network status only; it does not block API calls.

====================================================================
Sub-Task 2 – “baseQuery.ts with Timeout, Retry & JWT Injection”
--------------------------------------------------------------------
Story Points: 4  
Component: CPAPP-STATE (RTK Query)

1. Acceptance Criteria  
   • RTK Query `baseQuery` automatically injects `Authorization: Bearer <token>` when `state.auth.token` is present, applies a 15 s timeout (`API_TIMEOUT_MS`) and performs exactly one automatic retry on `FETCH_ERROR`, with no infinite loops.  
   • Timeout and retry values are configurable via env vars (`REACT_APP_API_TIMEOUT`, `REACT_APP_API_RETRY`) and exposed as constants (`API_TIMEOUT_MS`, `API_RETRY_COUNT`) with defaults of 15000 ms and 1.  
   • Unit tests cover ≥ 90 % lines of `baseQuery` validating header injection, timeout, and single-retry behaviour.

2. Dependencies  
   • Existing Redux store, `authSlice`, and `fetchBaseQuery` from RTK Query.  
   • Sub-Task 1 not required.

3. Implementation Approach  
   a. Create `src/config/Network.ts` exporting `API_TIMEOUT_MS` and `API_RETRY_COUNT`.  
   b. Build `src/store/api/baseQuery.ts`  
      – Wrap `fetchBaseQuery` with `prepareHeaders` callback.  
      – Use `AbortController` + `setTimeout` for request cancellation.  
      – Compose with RTK’s `retry` util (`maxRetries: API_RETRY_COUNT`).  
   c. Refactor existing `src/store/api/baseApi.ts` to import the new `customBaseQuery`.  

4. New Code Artifacts  
   • `src/config/Network.ts`  
     – `export const API_TIMEOUT_MS = Number(getConfigValue('REACT_APP_API_TIMEOUT', '15000'));`  
     – `export const API_RETRY_COUNT = Number(getConfigValue('REACT_APP_API_RETRY', '1'));`  
   • `src/store/api/baseQuery.ts`  
     – `export const customBaseQuery: BaseQueryFn<...>` – timeout / retry / JWT injection  
   • **Modifications**  
     – `src/store/api/baseApi.ts` – use `customBaseQuery` instead of `fetchBaseQuery`  
   • `__tests__/store/api/baseQuery.test.ts`

5. Expected Outputs  
   • All existing RTK endpoints compile and tests remain green.  
   • CI passes with updated coverage badge.

6. Testing Requirements  
   • Mock `global.fetch` to validate header injection, 15 s timeout, and single retry count.  
   • Ensure no state mutation outside Redux flow (pure function).

7. Additional Specs  
   • `customBaseQuery` must read the token inside the callback (no stale closures).  
   • Constants centralised in `Network.ts` for future tweak via `.env`.

====================================================================
Sub-Task 3 – “Global HTTP Error Middleware & Auto-Logout”
--------------------------------------------------------------------
Story Points: 3  
Component: CPAPP-STATE

1. Acceptance Criteria  
   • Redux middleware intercepts all `api/executeQuery/rejected` actions: on status 401 or 403 it dispatches `authSlice.logout()` and resets navigation to `LoginScreen`; on any other 4xx/5xx status it triggers a user-friendly toast mapped from `status → message`.  
   • Auto-logout fully clears persisted auth state and prevents further JWT injection.  
   • Middleware unit tests achieve ≥ 85 % business-logic coverage and confirm no toast on successful queries.

2. Dependencies  
   • Sub-Task 2 (`customBaseQuery`) in place.  
   • Navigation ref exported in `NavigationProvider`.  
   • Toast library (`react-native-toast-message`) to be added.

3. Implementation Approach  
   a. Add `src/store/middleware/errorMiddleware.ts`  
      – Inspect `action.error.originalStatus`.  
      – Dispatch logout on 401/403, else call toast.  
   b. Register middleware in `src/store/index.ts` **after** `api.middleware`.  
   c. Create `src/utils/errorMessage.ts` mapping status codes to messages.  
   d. Integrate `<Toast/>` container in `App.tsx` root (below `ConnectivityProvider`).  

4. New Code Artifacts  
   • `src/store/middleware/errorMiddleware.ts`  
     – `export const errorMiddleware: Middleware`  
   • `src/utils/errorMessage.ts` – `export function getFriendlyMessage(status: number): string`  
   • **Dependencies** – add `"react-native-toast-message": "^2.x"` to `package.json`.  
   • `__tests__/store/middleware/errorMiddleware.test.ts`

5. Expected Outputs  
   • Mocked 500 response dispatch shows toast with “Something went wrong. Please try again.”.  
   • Mocked 401 response results in logout and navigation reset.

6. Testing Requirements  
   • Jest spies on `store.dispatch`, `navigationRef.reset`, and toast invocation.  
   • Verify middleware ignores fulfilled actions.

7. Additional Specs  
   • Toast duration = 3000 ms, includes `accessibilityLiveRegion="assertive"`.  
   • Friendly messages sourced from single mapping util for reuse.

====================================================================
Sub-Task 4 – “ErrorBoundary Wrapper”
--------------------------------------------------------------------
Story Points: 2  
Component: CPAPP-UI

1. Acceptance Criteria  
   • Any uncaught JS exception in the subtree renders a fallback screen with the message “Something went wrong” and a “Restart App” button that calls a placeholder `RNRestart.restart()`.  
   • Error and stack trace are logged to `console.error` for future Crashlytics hookup.  
   • Component resets its `hasError` state on restart allowing normal re-render.

2. Dependencies  
   • None.

3. Implementation Approach  
   a. Create `src/components/common/ErrorBoundary.tsx` extending `React.Component`.  
   b. Wrap `<ThemeProvider>` + `<NavigationProvider>` with `<ErrorBoundary>` in `App.tsx`.  
   c. Style fallback in harmony with Theme colours.

4. New Code Artifacts  
   • `src/components/common/ErrorBoundary.tsx`  
     – `interface ErrorBoundaryState { hasError: boolean }`  
   • `__tests__/components/ErrorBoundary.test.ts`

5. Expected Outputs  
   • Forced error in test component shows fallback UI and resets after restart.

6. Testing Requirements  
   • Snapshot test of fallback.  
   • Mock `RNRestart.restart` in test to ensure it’s invoked.

7. Additional Specs  
   • Leave hooks for later Sentry integration (`componentDidCatch`).

====================================================================
Sub-Task 5 – “Comprehensive Unit Tests & CI Integration”
--------------------------------------------------------------------
Story Points: 3  
Component: CPAPP-STATE, CPAPP-UI, CPAPP-SYNC

1. Acceptance Criteria  
   • New test suites for sub-tasks 1-4 added, keeping overall project coverage ≥ 80 % and business-logic coverage ≥ 85 %.  
   • GitHub Actions workflow (`mobile-ci.yml`) passes on first run with no new lint or Sonar issues.  
   • Coverage badge (`coverage-badge.svg`) auto-updates via existing script.

2. Dependencies  
   • Completion of Sub-Tasks 1-4.  

3. Implementation Approach  
   a. Add mocks:  
      – `__tests__/mocks/NetInfoMock.ts`  
      – `__tests__/mocks/fetchMock.ts`  
      – `__tests__/mocks/ToastMock.ts`  
      – `__tests__/mocks/navigationRefMock.ts`  
   b. Update `jest.setup.ts` to auto-mock NetInfo and Toast.  
   c. Ensure `scripts/badges/coverage.sh` includes `contexts/`, `middleware/`, and `utils/` folders.  

4. New Code Artifacts  
   • Mock files listed above.  
   • Modifications to `jest.setup.ts`, `mobile-ci.yml`.

5. Expected Outputs  
   • Local `yarn test` and CI pipeline both succeed with coverage thresholds met.

6. Testing Requirements  
   • Simulate offline/online toggles, fetch timeouts, HTTP error codes, and component errors in dedicated tests.  
   • Sonar reports no new code smells or duplications.

7. Additional Specs  
   • Jest `maxWorkers=50 %` already configured in root; keep for CI speed.

====================================================================
Cross-Task Notes & Global Specifications
--------------------------------------------------------------------
• Security: JWT still sourced from Redux-persist; react-native-keychain integration planned in later sprint.  
• Performance: Single NetInfo listener; Banner uses `Animated` for 60 fps.  
• Configuration:  
  – `REACT_APP_API_TIMEOUT` (ms) default 15000  
  – `REACT_APP_API_RETRY` default 1  
  – Values surfaced via `src/config/Network.ts`.  
• Documentation: Add `docs/adr/ADR-0003-network-layer.md` describing design (timeout, retry, middleware, connectivity).  
• Definition of Done: All sub-task acceptance criteria met, tests green, Sonar & ESLint clean, docs updated, PR merged to `staging`.

====================================================================
Dependency / Execution Order
1️⃣ Sub-Task 1 (Connectivity)  
2️⃣ Sub-Task 2 (baseQuery)  
3️⃣ Sub-Task 3 (Error middleware) – depends on 2  
4️⃣ Sub-Task 4 (ErrorBoundary) – parallel  
5️⃣ Sub-Task 5 (Tests) – final integrator  

Total Story Points: 15  
Ready for Sprint 1 continuation.