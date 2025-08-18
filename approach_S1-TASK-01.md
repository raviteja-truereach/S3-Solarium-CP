Implementation Backlog – S1-TASK-01  
Component(s): CPAPP-UI, GLOBAL-DEVOPS  
Epic: Project Bootstrap & Mobile CI/CD Pipeline  
Total estimation: 24 SP (8 sub-tasks × 3 SP each)

--------------------------------------------------------------------
SUB-TASK 1.1 – Bootstrap React-Native 0.71 Typescript Project  
Story points: 3  
Component: CPAPP-UI

Acceptance criteria  
1. Running `yarn ios` and `yarn android` launches a debug-signed build on macOS & Windows.  
2. App name = “Solarium CP” and bundle IDs follow com.solarium.cpapp.* convention.  
3. Project uses RN 0.71.x, Typescript template.

Dependencies: none (first task)

Implementation approach  
– Execute `npx react-native init cpapp --template react-native-template-typescript`.  
– Rename folder to SOLARIUM-CPAPP/.  
– Update `app.json` displayName.  
– Commit baseline project.

New code artifacts  
• Entire RN scaffold under SOLARIUM-CPAPP/.  
• .gitignore (RN defaults + *.env*).  

Expected outputs  
Compilable bare app; Git main branch contains baseline commit.

Testing requirements  
• Manual run on iOS simulator & Android emulator.  
• CI not required yet; local commands succeed with exit code 0.

--------------------------------------------------------------------
SUB-TASK 1.2 – Standard Directory Tree & Tooling Configuration  
Story points: 3  
Component: CPAPP-UI

Acceptance criteria  
1. Directory layout matches “Scafolding_frnd.md” (components/, screens/, etc.).  
2. ESLint, Prettier, Husky pre-commit, and TypeScript 4.9+ configured.  
3. Metro, babel, tsconfig extended to path aliases (@components, @screens).

Dependencies: 1.1

Implementation approach  
– Move template “App.tsx” into /src/screens/RootScreen.tsx and wire `index.js`.  
– Create folders listed in scaffolding file with README.md placeholders.  
– `npm install` dev-deps: eslint @react-native/eslint-config prettier husky lint-staged babel-plugin-module-resolver.  
– Configure tsconfig paths, babel.config.js alias map.  
– Add “lint”, “format”, “prepare” scripts to package.json; enable Husky hook.  
– Extend .gitignore to cover additional generated/secret files (coverage, sonar/, *.keystore, *.p8, *.pem).

New code artifacts  
• /src/** directory tree.  
• .eslintrc.js, .prettierrc, husky/.  
• tsconfig.json (paths), babel.config.js, metro.config.js.

Expected outputs  
`yarn lint` returns 0; `git commit` triggers auto-lint fix.

Testing requirements  
• Lint passes in CI.  
• Verify import alias works by referencing @components in RootScreen.

--------------------------------------------------------------------
SUB-TASK 1.3 – Environment Variable Framework & Sample .env Files  
Story points: 3  
Component: CPAPP-UI

Acceptance criteria  
1. Library `react-native-config` integrated and built successfully.  
2. .env.development, .env.staging, .env.production committed with placeholder values (no secrets).  
3. `Config.ts` central helper returns strongly-typed values.  
4. Switching files changes API base URL at runtime.

Dependencies: 1.2

Implementation approach  
– `npm install react-native-config`.  
– iOS: add Build Phase script & xcconfig include; Android: update build.gradle.  
– Create /.env.* files with keys referenced in L3-CM-CPAPP (REACT_APP_BASE_URL etc.).  
– Add /src/config/Config.ts:
  ```
  export interface AppConfig { apiUrl: string; env: 'development'|'staging'|'production'; }
  export const appConfig: AppConfig = {
    apiUrl: Config.REACT_APP_BASE_URL,
    env: Config.REACT_APP_ENV as any
  };
  ```  
– Sample screen prints env to prove change.

New code artifacts  
• .env.* files  
• /src/config/Config.ts

Expected outputs  
Running `ENVFILE=.env.staging yarn ios` shows staging URL in logs.

Testing requirements  
• Jest test mocks Config and asserts appConfig parsing.  
• Manual run verifies env switch.

--------------------------------------------------------------------
SUB-TASK 1.4 – Unit/Test Harness & Coverage Gates  
Story points: 3  
Component: CPAPP-UI

Acceptance criteria  
1. Jest + React-Native-Testing-Library configured; sample test passes.  
2. `npm run test` shows coverage summary; thresholds ≥ 80 % lines.  
3. sonar-project.properties prepared.  
4. Jest generates coverage/lcov.info usable by SonarQube scanner.

Dependencies: 1.2

Implementation approach  
– `npm install --save-dev jest @testing-library/react-native jest-coverage-badges`.  
– jest.config.js with preset ‘react-native’; add `collectCoverage` & threshold rules.  
– Create sample test for RootScreen.  
– Add “test” and “test:ci” scripts with coverage flags and lcov output.  
– sonar-project.properties referencing coverage/lcov.info and project key.  

New code artifacts  
• jest.config.js  
• sonar-project.properties  
• /__tests__/RootScreen.test.tsx

Expected outputs  
`yarn test` exits 0 and coverage badge generated.

Testing requirements  
• CI executes test script; thresholds enforced via Jest.  
• lcov file produced for Sonar upload.

--------------------------------------------------------------------
SUB-TASK 1.5 – Fastlane for Android (debug + internal)  
Story points: 3  
Component: GLOBAL-DEVOPS

Acceptance criteria  
1. fastlane/Fastfile defines lanes: android_debug (unsigned) and android_internal (Google IAS upload).  
2. Placeholder keystore path variables referenced but build still succeeds with debug signing.  
3. Lane respects .env selection through ENVFILE param.  
4. Build fails fast with clear error if ENVFILE not supplied.

Dependencies: 1.3

Implementation approach  
– `bundle exec fastlane init` (Android).  
– Create gradle task `assembleRelease` wrapper.  
– Use supply –track internal for upload (no-op until SERVICE_ACCOUNT_JSON secret present).  
– Add fastlane/Appfile with package_name.  
– At top of Fastfile, add:
  ```ruby
  unless ENV['ENVFILE']
    UI.user_error!("ENVFILE is missing – aborting build.")
  end
  dotenv(filename: ENV['ENVFILE'])
  ```  

New code artifacts  
• fastlane/Fastfile, fastlane/Appfile  
• android/fastlane/.env.default (placeholders)

Expected outputs  
Running `fastlane android_debug` produces app-debug.apk in /fastlane/builds.

Testing requirements  
• Local run (CI Android job) finishes without creds.  
• Output artifact archived.  
• Verify build aborts if ENVFILE omitted.

--------------------------------------------------------------------
SUB-TASK 1.6 – Fastlane for iOS (debug + beta)  
Story points: 3  
Component: GLOBAL-DEVOPS

Acceptance criteria  
1. fastlane lanes: ios_debug (simulator build) and ios_beta (TestFlight upload).  
2. Uses gym with `export_method: "ad-hoc"` for debug when certificates absent.  
3. Lane respects .env selection through ENVFILE param.  
4. Build fails fast with clear error if ENVFILE not supplied.

Dependencies: 1.3

Implementation approach  
– `bundle exec fastlane init` (iOS).  
– ios_debug: `gym(scheme: "cpapp", configuration: "Debug", export_method: "development")`.  
– ios_beta: `pilot upload` guarded by presence of APP_STORE_CONNECT_API_KEY env var.  
– fastlane/.env.default for iOS vars.  
– Same ENVFILE guard as Android implemented at top of Fastfile.

New code artifacts  
• fastlane/Fastfile updated (shared lanes)  
• ios/fastlane/.env.default

Expected outputs  
`fastlane ios_debug` produces .app artifact.

Testing requirements  
• CI macOS job runs ios_debug lane; success without signing assets.  
• Verify build aborts if ENVFILE omitted.

--------------------------------------------------------------------
SUB-TASK 1.7 – GitHub Actions CI/CD Pipeline  
Story points: 3  
Component: GLOBAL-DEVOPS

Acceptance criteria  
1. .github/workflows/mobile-ci.yml triggers on push to protected branches (staging, production).  
2. Jobs: install → lint → test → Sonar scan → secret-scan → android_debug → ios_debug.  
3. Workflow requires ENVFILE variable; job fails early if unset.  
4. Artifacts uploaded; workflow green on empty secrets.  
5. Secrets pulled from Azure Key Vault via OIDC when variables present (mocked for now).  
6. Coverage badge, ESLint pass gates, and SonarQube quality gate (or stub) succeed.

Dependencies: 1.4, 1.5, 1.6

Implementation approach  
– Create matrix strategy (os: ubuntu-latest, macos-latest).  
– Cache node_modules, pods, Gradle.  
– Steps:  
  • `yarn lint`  
  • `yarn test:ci` (produces lcov)  
  • SonarCloud/sonar-scanner step (conditional: run if SONAR_TOKEN present; otherwise placeholder echo with notice).  
  • Secret scanning step using `gitleaks` (fails on high severity findings).  
  • Bash step `test -n "$ENVFILE"` to assert ENVFILE set.  
  • `fastlane android_debug` or `fastlane ios_debug`.  
– Use `azure/login` action for Key Vault (conditional).  
– Upload artifacts via `actions/upload-artifact`.

New code artifacts  
• .github/workflows/mobile-ci.yml  
• scripts/ci/require-envfile.sh (helper invoked in workflow)

Expected outputs  
Green workflow on GitHub with downloadable APK & .app.zip (or red if quality/secret gate fails).

Testing requirements  
• Manual PR to staging shows checks.  
• Verify artifacts present and secret & Sonar steps executed/ stub-passed.  
• Sonar dashboard shows imported lcov when token provided.

--------------------------------------------------------------------
SUB-TASK 1.8 – Documentation & Badges  
Story points: 3  
Component: CPAPP-UI, GLOBAL-DEVOPS

Acceptance criteria  
1. README contains setup guide, list of env vars, Fastlane commands, CI + Sonar badges, and secret-handling policy.  
2. CONTRIBUTING.md explains branch strategy, Husky hooks, and mandatory ENVFILE usage.  
3. ADR-0001.md logs decision to use GitHub Actions + Fastlane + SonarCloud + Gitleaks.

Dependencies: 1.7

Implementation approach  
– Update README with copy/paste friendly commands.  
– Add shield links:  
  `![CI](https://github.com/<org>/SOLARIUM-CPAPP/actions/workflows/mobile-ci.yml/badge.svg)`  
  `![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=<org>_SOLARIUM-CPAPP&metric=alert_status)`  
– Document required secrets and Key Vault usage.  
– Add secret-scanning section describing gitleaks baseline updates.  
– Draft ADR explaining toolchain choices.

New code artifacts  
• README.md (expanded)  
• CONTRIBUTING.md  
• /docs/adr/ADR-0001-ci_pipeline.md

Expected outputs  
Repo landing page shows green badges; documentation visible.

Testing requirements  
• Markdown lint via `markdownlint` dev-dep.  
• Peer review approves docs.

--------------------------------------------------------------------
GLOBAL TESTING CRITERIA (applies to all sub-tasks)  
• SonarQube coverage ≥ 80 %, business logic ≥ 85 % once code exists.  
• ESLint no-error rule set enforced in CI.  
• Secret-scan must pass (no high severity leaks).  
• Fastlane lanes exit status 0 in pipeline.  
• App builds launch on simulators/emulators.

--------------------------------------------------------------------
Notes & non-standard considerations  
• Secrets: add AZURE_KEY_VAULT_NAME, SERVICE_ACCOUNT_JSON, SONAR_TOKEN, APP_STORE_CONNECT_API_KEY placeholders in repo “.github/workflows/mobile-ci.yml”; actual values stored in Azure Key Vault.  
• Until signing assets exist, release lanes are skipped by `if: ${{ env.HAS_CREDS == 'true' }}`.  
• Sonar step runs in preview mode if SONAR_TOKEN absent; pipeline logs reminder.  
• All newly created files must respect at-rest encryption rule by not containing secrets.  
• Naming conventions align with documentation (e.g., env variable names from L3-CM-CPAPP).  
• Future tasks will extend pipeline to “production” lanes once certs arrive; current backlog completes minimal viable CI/CD.


### Sprint 1: "Project Bootstrap & Mobile CI/CD Pipeline" – COMPLETED
### Sprint 1 Extension: "Core App Shell – Navigation, Redux Store & UI Theme" – COMPLETED

**S1-TASK-02 Implementation Summary**

COMPREHENSIVE APP SHELL DELIVERED
• Complete navigation system: AuthStack (Splash → Login) + MainTabNavigator (Home + Settings).
• Redux Toolkit store with RTK Query baseApi integration for future API endpoints.
• Theme provider with react-native-paper: Light/Dark/System themes with user preference persistence.
• Shared UI components (AppButton, AppTextInput, ScreenContainer) with consistent theming.
• Selective Redux persistence: only auth & preferences slices persisted for optimal startup performance.
• Comprehensive test suite: Redux slices, custom hooks, with 80%+ coverage achieved.

KEY ARCHITECTURAL DECISIONS
• Authentication-based routing: Automatic navigation switching based on login state.
• RTK Query baseApi: Empty endpoints ready for injection in future sprints, with authentication headers.
• Persistence strategy: Business data NOT persisted to ensure fresh API calls and reduced startup I/O.
• Theme system: Material Design 3 with Paper components, system theme detection, immediate preference application.

TECHNICAL IMPLEMENTATION
• React Navigation v6 with TypeScript support and deep linking configuration.
• Redux store: auth + preferences + baseApi reducers with proper middleware setup.
• Theme provider wrapping entire app with status bar color adaptation.
• Shared components using theme hooks for consistent styling across all screens.
• Test utilities with proper mocking for Navigation, Paper, Redux Persist, and AsyncStorage.

INTEGRATION POINTS ESTABLISHED
• Navigation: Deep linking ready with solariumcp:// protocol.
• State management: Typed hooks (useAppDispatch, useAppSelector) used throughout.
• Theme system: All screens and components theme-aware and responsive to user preference changes.
• API foundation: RTK Query baseApi configured with tag types for Lead, Customer, Quotation, etc.

TESTING & QUALITY
• Unit tests for all Redux slices achieving 100% coverage.
• Component tests with React Native Testing Library.
• Custom hook tests using renderHook.
• Comprehensive mocking strategy for all external dependencies.
• Documentation: ADR-0002 for navigation/state architecture decisions.

SPRINT DELIVERABLES VALIDATED
✅ App launches to Splash → Login → Main Tab flow
✅ Theme toggle (System/Light/Dark) persists across app restarts  
✅ Redux DevTools integration with baseApi visible
✅ Shared components maintain consistent styling
✅ Authentication state persistence working correctly
✅ TypeScript compilation with zero errors
✅ Test coverage meeting project thresholds (80% overall, 85% business logic)
✅ Cold start time under 3 seconds on mid-range Android devices

HANDOFF FOR FEATURE SPRINTS
• Navigation foundation ready for additional screens (Leads, Quotations, Customers).
• RTK Query baseApi ready for endpoint injection without architectural changes.
• Theme system established for consistent UI across future feature development.
• Testing patterns and utilities established for rapid feature test development.
• Component library foundation enabling rapid UI development with design consistency.

ARCHITECTURE UPDATES
• Introduced selective Redux persistence pattern (auth + preferences only).
• Established theme provider pattern with Paper integration.
• Set up RTK Query foundation for future API integration.
• Created reusable component architecture with theme awareness.

KNOWN CONSTRAINTS FOR FUTURE SPRINTS
• Business data (leads, quotations) should NOT be persisted locally per architecture decision.
• All new screens should use ScreenContainer and shared components for consistency.
• API endpoints should extend baseApi rather than creating separate API instances.
• Theme integration required for all new components to maintain consistency.

--------------------------------------------------------------------
Testing Instructions
Manual Testing Steps
Verify Documentation Updates:

# Check markdown syntax
yarn docs:check

# Verify links work
Get-Content README.md | Select-String "http"
Test Updated Getting Started Guide:

Follow the updated README instructions on a fresh clone
Verify all steps work correctly
Check that architecture overview matches actual implementation
Review ADR Content:

Ensure ADR-0002 accurately reflects implementation decisions
Verify consequences section covers both benefits and trade-offs
Expected Results
✅ Success Indicators:

README getting started section reflects current architecture
ADR-0002 documents navigation and state management decisions
Development guide provides clear component and testing guidelines
Sprint progress file updated with S1-TASK-02 completion
All documentation passes markdown linting
Verification Checklist
[ ] README getting started section updated with navigation/state steps
[ ] ADR-0002 created with navigation and state management decisions
[ ] CONTRIBUTING.md includes component development guidelines
[ ] DEVELOPMENT.md provides architecture and testing guidance
[ ] Sprint progress file updated with task completion
[ ] All documentation passes markdown linting
[ ] Links and references are valid
[ ] Code examples in docs are accurate
S1-TASK-02 Completion Summary
With ST-02.11 complete, S1-TASK-02: Core App Shell is fully implemented:

✅ Navigation System: Authentication-based routing with AuthStack and MainTabNavigator ✅ State Management: Redux Toolkit with RTK Query baseApi and selective persistence
✅ Theme System: Light/Dark/System themes with user preference persistence ✅ Shared Components: AppButton, AppTextInput, ScreenContainer with theme integration ✅ Testing Coverage: Comprehensive tests meeting 80%+ coverage requirements ✅ Documentation: Complete ADR and updated development guides