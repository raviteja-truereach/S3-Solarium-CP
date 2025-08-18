Implementation Backlog — S1-TASK-05 “Testing & Quality Scaffold”  
Component(s): CPAPP-STATE, GLOBAL-QUALITY  
Epic / Sprint: Sprint-1 – “Project Bootstrap, Mobile CI/CD & Core App Shell”

--------------------------------------------------------------------------------------------------------------------
OVERVIEW
The goal of S1-TASK-05 is to introduce a production-ready unit / component testing scaffold with Jest + React-Native-Testing-Library, baseline code-coverage reporting, and CI enforcement (initial ≥ **80 %** – aligned with the thresholds already merged in the code-base).  The backlog below decomposes the work into INVEST-compliant, independently deployable sub-tasks (2-4 SP each).

Coverage targets will be raised again in later sprints; therefore all thresholds are parameterised in one place (`coverageThreshold` in `jest.config.js`) to simplify future hardening.

--------------------------------------------------------------------------------------------------------------------
SUB-TASK BREAKDOWN

ST-05.1  Install & Pin Test Toolchain (2 SP)  
• Acceptance Criteria  
  1. `package.json` lists exact versions for `jest`, `babel-jest`, `@testing-library/react-native`, `@testing-library/jest-native`, `@types/jest`, `ts-jest`, `jest-coverage-badges`.  
  2. `yarn install` succeeds locally and in CI.  
• Dependencies None.  
• Implementation Approach  
  a. Add dev-dependencies (versions from architecture doc).  
  b. Add npm script aliases: `test`, `test:ci`, `test:watch`, `test:coverage`.  
• New Code Artifacts  
  – `package.json` → scripts block (adds: `"test"`, `"test:ci"`, `"test:watch"`, `"test:coverage"`).  
• Expected Outputs  
  – Lock-file updated; CI caches node_modules correctly.  
• Testing Requirements  
  – Run `yarn test --watchAll=false` locally; exit code 0.  
  – Sonar scanner classifies new libraries as “test” code.  
• Additional Specs  
  – Yarn resolutions to avoid FB Jest / RN version drift.

-----------------------------------------------------------------------------------------------------

ST-05.2  Configure Jest Core & TS Preset (3 SP)  
• Acceptance Criteria  
  1. `jest.config.js` exists at repo root.  
  2. TypeScript transforms via `ts-jest`.  
  3. Module-alias resolution matches Babel aliases (`@components`, `@screens`, …).  
  4. Coverage collection enabled with **80 %** global gate (branches / lines / functions / statements) matching existing implementation.  
• Dependencies ST-05.1  
• Implementation Approach  
  a. Copy base from sample; adjust `preset: 'react-native'`.  
  b. Inject `collectCoverageFrom` patterns (exclude *.d.ts, mocks, e2e).  
  c. Define `coverageThreshold.global.* = 0.80`.  
  d. Add `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`.  
• New Code Artifacts  
  – `jest.config.js` (root) — master test configuration.  
• Expected Outputs  
  – `yarn test` produces coverage summary respecting 80 % gate.  
• Testing Requirements  
  – Deliberately remove a test and confirm coverage breach causes Jest non-zero exit.  
• Additional Specs  
  – Ensure Babel `module-resolver` plugin mirrors Jest’s `moduleNameMapper`.

-----------------------------------------------------------------------------------------------------

ST-05.3  Global Jest Setup & Lightweight Mocks (3 SP)  
• Acceptance Criteria  
  1. `jest.setup.ts` registers RTL matchers, `react-native-gesture-handler/jestSetup`, AsyncStorage & NetInfo mocks.  
  2. Tests run without Red-Screen warnings.  
• Dependencies ST-05.2  
• Implementation Approach  
  a. Create / validate `__tests__/mocks/AsyncStorageMock.ts`, `NetInfoMock.ts`, `fetchMock.ts` (skip if already present but ensure API parity).  
  b. In `jest.setup.ts` mock:  
     – `@react-native-async-storage/async-storage`  
     – `@react-native-community/netinfo`  
     – `react-native-restart` (graceful noop)  
     – Silence noisy RN console logs.  
• New Code Artifacts  
  – `jest.setup.ts` (root).  
  – `__tests__/mocks/<…>.ts` (mocks folder).  
• Expected Outputs  
  – Running any test never touches the network or device APIs.  
• Testing Requirements  
  – Add sanity test (`expect(true).toBeTruthy()`) to verify setup.  
• Additional Specs  
  – Keep mocks tree under `__tests__/mocks/` so coverage is ignored.

-----------------------------------------------------------------------------------------------------

ST-05.4  Seed Sample Tests (Reducers & UI) (3 SP)  
• Acceptance Criteria  
  1. Unit test for `authSlice` covers login / logout / edge cases (≥ 90 % for slice).  
  2. Snapshot test for `AppButton` renders consistently and passes accessibility role assertions.  
  3. Combined test suite lifts global coverage ≥ **85 %** (buffer above 80 % threshold).  
• Dependencies ST-05.3  
• Implementation Approach  
  a. Create `__tests__/store/authSlice.test.ts` using existing slice.  
  b. Create `__tests__/components/AppButton.test.tsx` with RTL snapshot & a11y checks.  
• New Code Artifacts  
  – `__tests__/store/authSlice.test.ts`.  
  – `__tests__/components/AppButton.test.tsx`.  
  – Function added inside test utils:  
    ```ts
    // file: __tests__/setup/testUtils.tsx
    export const renderWithPaper = (ui: React.ReactElement, opts?: RenderOptions): RenderResult;
    ```  
• Expected Outputs  
  – `yarn test` passes; HTML report shows slice file ≥ 90 % lines.  
• Testing Requirements  
  – Negative assertion: wrong props fail snapshot.  
  – Accessibility: role `button` equals “button”.  
• Additional Specs  
  – Use `render` helper from test utils with `PaperProvider`.

-----------------------------------------------------------------------------------------------------

ST-05.5  Generate Coverage Badges & Summary Script (2 SP)  
• Acceptance Criteria  
  1. Script `scripts/generate-badges.js` reads `coverage-summary.json` and places SVG placeholders under `coverage/badges/`.  
  2. README displays dynamic badge URLs (comment placeholder).  
• Dependencies ST-05.4  
• Implementation Approach  
  a. Port Node script (~60 LOC) with thresholds colour logic.  
  b. Add npm script `badges:generate`.  
• New Code Artifacts  
  – `scripts/generate-badges.js` (node script).  
  – **Function specifications** in `scripts/generate-badges.js`:  
    ```ts
    /**
     * Returns shields.io colour based on coverage %
     * @param pct number (0-100)
     * @returns 'brightgreen' | 'yellow' | 'red'
     */
    function getCoverageColor(pct: number): string;
    ```  
• Expected Outputs  
  – Badges folder created after CI run.  
• Testing Requirements  
  – Unit test for helper `getCoverageColor` under `__tests__/utils/generateBadges.test.ts`.  
• Additional Specs  
  – Badge SVG is comment stub (actual image via shields.io at README render time).

-----------------------------------------------------------------------------------------------------

ST-05.6  CI Integration: Lint + Coverage Gate (3 SP)  
• Acceptance Criteria  
  1. `mobile-ci.yml` job runs steps in order: install → lint → type-check → `yarn test:ci`.  
  2. Pipeline fails when:  
     – ESLint returns non-zero, OR  
     – Coverage < **80 %**.  
  3. Coverage uploaded to Codecov; PR comment summarises %.  
• Dependencies ST-05.5  
• Implementation Approach  
  a. Extend existing GitHub Action (job `test`) with `run: yarn test:ci`.  
  b. Use `jest --ci --coverage` so Jest exits non-zero on threshold breach.  
  c. Re-use Codecov step; ensure coverage file path matches.  
• New Code Artifacts  
  – `.github/workflows/mobile-ci.yml` (modified).  
• Expected Outputs  
  – Green tick only when lint & coverage pass.  
• Testing Requirements  
  – Push branch with failing test → CI red; push fix → CI green.  
• Additional Specs  
  – Cache `~/.jest` to speed pipeline.

-----------------------------------------------------------------------------------------------------

ST-05.7  Developer Documentation & Contribution Guide (2 SP)  
• Acceptance Criteria  
  1. `docs/README.md` “Testing” section describes: running unit tests, updating snapshots, generating coverage.  
  2. `CONTRIBUTING.md` states PRs must keep coverage ≥ **80 %**.  
• Dependencies ST-05.6  
• Implementation Approach  
  a. Update docs with commands & troubleshooting notes (Metro cache, mocks).  
  b. Link to ADR-0001 CI pipeline for rationale.  
• New Code Artifacts  
  – `docs/README.md` (patched).  
  – `CONTRIBUTING.md` (patched).  
• Expected Outputs  
  – markdownlint passes in CI (`yarn docs:check`).  
• Testing Requirements  
  – Docs rendered correctly on GitHub.  
• Additional Specs  
  – Highlight roadmap to 90 %+ coverage in Sprint-3.

--------------------------------------------------------------------------------------------------------------------
GLOBAL ACCEPTANCE CRITERIA (Epic Level)  
✔ `yarn test` passes locally without warnings.  
✔ Global coverage ≥ **80 %** and enforced via Jest threshold & CI.  
✔ ESLint + Prettier gating integrated in same CI job.  
✔ No regressions in existing mobile build / Fastlane lanes.  
✔ Documentation reflects new workflow.

--------------------------------------------------------------------------------------------------------------------
RISK & MITIGATION  
• Risk: RN/Jest version drift → Pin exact versions; run on RN 0.71 docker image in CI.  
• Risk: Flaky snapshots in different OS fonts → Use `react-test-renderer` with `.toJSON()` for stable output.

--------------------------------------------------------------------------------------------------------------------
END OF BACKLOG