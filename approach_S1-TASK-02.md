Implementation Backlog – S1-TASK-02  
Core App Shell: Navigation, Redux Store & UI Theme  

Epic ID: S1-TASK-02  
Affected Components: CPAPP-UI, CPAPP-STATE  
Business Value: Provides the runnable foundation (navigation, state, theme) required by all subsequent feature sprints.

--------------------------------------------------------------------
Global Dependencies & Constraints
• React-Native 0.71.x scaffold already present (RootScreen, Config wrapper).  
• Must keep cold start ≤ 3 s on mid-range devices (L3-NFRS-CPAPP).  
• Strict TypeScript; ESLint/Prettier/CI gates already wired.  
• Persist only `auth` & `preferences` slices (theme-only data) to reduce start-up I/O and avoid persisting any business data.  
• Maintain ≥ 80 % overall / 85 % business-logic coverage (Sprint quality gate).  
--------------------------------------------------------------------

Sub-task index  
(2–4 story points each, ≤ 3 acceptance criteria)

ST-02.1 Add Navigation & State Dependencies – 2 pts  
ST-02.2 NavigationProvider & RootContainer – 3 pts  
ST-02.3 AuthStack Placeholder (Splash → Login) – 3 pts  
ST-02.4 MainTabNavigator (HomeStack & SettingsStack) – 4 pts  
ST-02.5 ThemeProvider & Preferences Slice – 3 pts  
ST-02.6 Auth & Preferences Slices, RTK Query Base, Typed Store + PersistGate – 4 pts  
ST-02.7 Shared UI Primitives (Button, TextInput, Screen) – 2 pts  
ST-02.8 Settings Screen (theme toggle) – 3 pts  
ST-02.9 Refactor Entry Point (App.tsx / index.js) – 2 pts  
ST-02.10 Unit & Component Tests – 4 pts  
ST-02.11 Docs & ADR update – 2 pts  

--------------------------------------------------------------------
Detailed Sub-tasks
--------------------------------------------------------------------

ST-02.1 Add Navigation & State Dependencies (2 pts)
1. Acceptance Criteria  
   • package.json lists @react-navigation/*, react-native-screens, react-native-safe-area-context, react-redux, @reduxjs/toolkit, @reduxjs/toolkit/query, redux-persist.  
   • iOS pods & Android autolinking verified via `yarn ios` / `yarn android`.  
2. Dependencies – none.  
3. Implementation Approach  
   • Add libs with yarn; run `pod install`.  
   • Update `babel.config.js` if needed for reanimated (but no code yet).  
4. New Code Artifacts – n/a (deps only).  
5. Expected Outputs – Successful build after install.  
6. Testing – Boot app in debug build; metro shows no unresolved module errors.  
7. Additional Specs – Pin versions compatible with RN 0.71.x.

--------------------------------------------------------------------

ST-02.2 NavigationProvider & RootContainer (3 pts)
1. Acceptance Criteria  
   • `NavigationProvider` wraps NavigationContainer + linking config.  
   • Displays AuthStack when `auth.isLoggedIn` is false, MainTabNavigator when true.  
   • No runtime TypeScript errors.  
2. Dependencies – ST-02.1.  
3. Implementation Approach  
   • Create `/src/navigation/NavigationProvider.tsx`.  
   • Use `useAppSelector` (from redux hooks) to read `auth.isLoggedIn`.  
   • Provide deep-link prefixes “solariumcp://”.  
4. New Code Artifacts  
   • src/navigation/NavigationProvider.tsx  
     - function NavigationProvider(): JSX.Element  
   • src/navigation/types.ts – RootParamList union.  
5. Expected Outputs – Hot reload shows switch when manually toggling auth slice in Redux DevTools.  
6. Testing – Snapshot test verifying correct navigator tree based on mocked auth state.  
7. Additional Specs – Enable `onReady` performance mark for future analytics.

--------------------------------------------------------------------

ST-02.3 AuthStack Placeholder (3 pts)
1. Acceptance Criteria  
   • AuthStack contains SplashScreen ➝ LoginScreen (placeholders).  
   • Stack can navigate Login → MainTab on fake login dispatch.  
2. Dependencies – ST-02.2.  
3. Implementation Approach  
   • Create `src/navigation/AuthStack.tsx`.  
   • Dummy `SplashScreen.tsx` uses setTimeout(1 s) to navigate to Login.  
   • `LoginScreen.tsx` has “Sign In” button dispatching `auth/loginSuccess`.  
4. New Code Artifacts  
   • src/screens/auth/SplashScreen.tsx  
     - SplashScreen(): JSX.Element  
   • src/screens/auth/LoginScreen.tsx  
     - LoginScreen(): JSX.Element  
   • src/navigation/AuthStack.tsx  
5. Expected Outputs – Tapping Sign In shows MainTab.  
6. Testing – RNTL test simulating button press & asserting navigation change.  
7. Additional Specs – Keep screens lightweight; real auth arrives later.

--------------------------------------------------------------------

ST-02.4 MainTabNavigator (Home & Settings) (4 pts)
1. Acceptance Criteria  
   • Bottom tab with icons “Home” & “Settings”.  
   • HomeStack hosts HomeScreen placeholder.  
   • Android hardware back exits app from Home root only.  
2. Dependencies – ST-02.2.  
3. Implementation Approach  
   • Create `src/navigation/MainTabNavigator.tsx`.  
   • Create `src/navigation/HomeStack.tsx`.  
4. New Code Artifacts  
   • src/navigation/MainTabNavigator.tsx  
   • src/navigation/HomeStack.tsx  
   • src/screens/home/HomeScreen.tsx (placeholder text).  
5. Expected Outputs – Tabs render with react-navigation icons.  
6. Testing – Snapshot & interaction tests for tab switch; back-handler test.  
7. Additional Specs – Use `react-native-vector-icons` already present via RN.

--------------------------------------------------------------------

ST-02.5 ThemeProvider & Preferences Slice (3 pts)
1. Acceptance Criteria  
   • App supports light/dark themes based on system default plus override.  
   • Theme preference persisted (preferences slice) and applied on relaunch.  
2. Dependencies – ST-02.1.  
3. Implementation Approach  
   • Add react-native-paper.  
   • Create `src/theme/index.ts` exporting lightTheme/darkTheme objects extending PaperDefault.  
   • Create `preferencesSlice` with `{ colorScheme: 'system' | 'light' | 'dark' }` as the ONLY persisted field.  
   • Create `ThemeProvider.tsx` wrapping PaperProvider & providing toggle util.  
4. New Code Artifacts  
   • src/theme/index.ts  
   • src/store/slices/preferencesSlice.ts  
   • src/theme/ThemeProvider.tsx  
   • src/hooks/useThemeToggle.ts  
5. Expected Outputs – Toggle in Settings screen changes all Paper components.  
6. Testing – Unit test for reducer; component test asserting backgroundColor change after toggle.  
7. Additional Specs – Provide `styled` helper for custom components.

--------------------------------------------------------------------

ST-02.6 Auth & Preferences Slices, RTK Query Base, Typed Store + PersistGate (4 pts)
1. Acceptance Criteria  
   • `createAppStore` returns configured store with `auth`, `preferences`, and built-in RTK Query `baseApi`.  
   • redux-persist whitelists ONLY `auth`, `preferences`; `baseApi` cache is NOT persisted.  
   • RTK Query middleware injected; `baseApi` created with no endpoints (placeholder) but able to accept dynamic endpoint injection in future sprints.  
   • Typed hooks `useAppDispatch`, `useAppSelector` available.  
2. Dependencies – ST-02.1.  
3. Implementation Approach  
   • Create `src/store/api/baseApi.ts` exporting empty `createApi` instance with `fetchBaseQuery` (apiUrl from Config).  
   • Configure store in `src/store/index.ts` using `configureStore`, add `baseApi.middleware`, set up `persistReducer`.  
   • Set up `PersistGate` wrapper component under `/src/store/PersistGateProvider.tsx` to improve tree readability.  
   • Export RootState, AppStore, AppDispatch, and typed hooks in `/src/hooks/reduxHooks.ts`.  
4. New Code Artifacts  
   • src/store/api/baseApi.ts  
     - export const baseApi = createApi({ reducerPath: 'baseApi', baseQuery: fetchBaseQuery({ baseUrl: appConfig.apiUrl }), endpoints: () => ({}) });  
   • src/store/index.ts  
     - function createAppStore(initialState?): AppStore  
   • src/store/slices/authSlice.ts  
     - initialState { isLoggedIn: boolean; token?: string }  
   • src/store/PersistGateProvider.tsx  
   • src/hooks/reduxHooks.ts  
5. Expected Outputs – No redux warnings; DevTools shows persisted slices; RTK Query devtools extension recognizes `baseApi`.  
6. Testing –  
   • Reducer tests for `auth` & `preferences`.  
   • Store initialization test ensuring `baseApi` reducer exists.  
   • Persist-rehydration test with mocked AsyncStorage verifies only whitelisted slices saved.  
7. Additional Specs – Persist to default storage (AsyncStorage); encryption planned in security hardening sprint.

--------------------------------------------------------------------

ST-02.7 Shared UI Primitives (2 pts)
1. Acceptance Criteria  
   • `AppButton`, `AppTextInput`, `ScreenContainer` components wrap Paper equivalents with project styling and theme awareness.  
   • Used by Settings & Login screens.  
2. Dependencies – ST-02.5.  
3. Implementation Approach  
   • Create `src/components/common/` directory.  
4. New Code Artifacts  
   • src/components/common/AppButton.tsx (props extend ButtonProps)  
   • src/components/common/AppTextInput.tsx  
   • src/components/common/ScreenContainer.tsx  
5. Expected Outputs – No duplication of styling rules in screens.  
6. Testing – Snapshot tests for each component.  
7. Additional Specs – Export barrel file for easy imports.

--------------------------------------------------------------------

ST-02.8 Settings Screen (theme toggle) (3 pts)
1. Acceptance Criteria  
   • User can pick System/Light/Dark; choice persists restart.  
   • Displays app version from `app.json` and env info (dev/staging/prod).  
2. Dependencies – ST-02.5, ST-02.7.  
3. Implementation Approach  
   • Create `SettingsScreen.tsx` using RadioButtons from Paper.  
   • Dispatch `preferencesSlice.actions.setColorScheme`.  
4. New Code Artifacts  
   • src/screens/settings/SettingsScreen.tsx  
5. Expected Outputs – Toggle works, verified after app relaunch.  
6. Testing – RNTL test toggling option and asserting Redux state.  
7. Additional Specs – Use ScreenContainer wrapper.

--------------------------------------------------------------------

ST-02.9 Refactor Entry Point (2 pts)
1. Acceptance Criteria  
   • App.tsx wraps store `<Provider>`, `<PersistGateProvider>`, `<ThemeProvider>`, `<NavigationProvider>`.  
   • Old RootScreen removed or repurposed as HomeScreen.  
2. Dependencies – ST-02.2, ST-02.5, ST-02.6.  
3. Implementation Approach  
   • Update index.js remains same.  
4. New Code Artifacts – none (modifications only).  
5. Expected Outputs – ESLint passes; app boots to SplashScreen.  
6. Testing – Manual smoke run on device.  
7. Additional Specs – Keep start-up JS bundle size delta in PR description.

--------------------------------------------------------------------

ST-02.10 Unit & Component Tests (4 pts)
1. Acceptance Criteria  
   • ≥ 85 % coverage for slices & theme logic; overall repo ≥ 80 %.  
   • All new components have snapshot + interaction tests.  
2. Dependencies – All prior sub-tasks.  
3. Implementation Approach  
   • Add tests under `__tests__` mirroring structure.  
   • Mock AsyncStorage with `@react-native-async-storage/async-storage/jest/async-storage-mock`.  
   • Mock RTK Query baseApi with `setupListeners` where required.  
4. New Code Artifacts  
   • __tests__/store/authSlice.test.ts  
   • __tests__/store/preferencesSlice.test.ts  
   • __tests__/store/baseApi.test.ts  
   • __tests__/navigation/navigationFlow.test.tsx  
   • __tests__/components/AppButton.test.tsx … etc.  
5. Expected Outputs – `yarn test` green; coverage badge updated by CI.  
6. Testing – Use RNTL + Jest; emulate color scheme toggles.

--------------------------------------------------------------------

ST-02.11 Documentation & ADR Update (2 pts)
1. Acceptance Criteria  
   • README “Getting Started” reflects new navigation/state steps.  
   • New ADR-0002-navigation-state.md captured.  
2. Dependencies – All implementation finished.  
3. Implementation Approach  
   • Update docs/ & sprint progress file.  
   • Explain RTK Query base presence and persist whitelist rationale (auth + preferences only).  
4. New Code Artifacts  
   • docs/adr/ADR-0002-navigation-state.md  
5. Expected Outputs – markdownlint passes, CI green.  
6. Testing – N/A  
7. Additional Specs – Mention decision to exclude business data from persistence for performance & compliance.

--------------------------------------------------------------------
Overall Completion Definition
• App opens to Home placeholder after Splash & Login stubs.  
• Light/Dark/System theme toggle in Settings persists across cold restart.  
• RTK Query baseApi integrated and visible in Redux DevTools with no endpoints.  
• No TypeScript/ESLint errors; CI pipeline passes including Sonar & coverage.  
• Cold start measured with RN perf monitor ≤ 3 s on Pixel 4a debug build.  

--------------------------------------------------------------------
End of Implementation Backlog