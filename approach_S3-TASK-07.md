# Implementation Backlog: Performance Budget Definition & App Insights Instrumentation (S3-TASK-07)

## Pre-Analysis Phase

### Current Codebase Analysis
Based on the codebase analysis:

1. **Existing Performance Infrastructure**:
   - `src/utils/PerformanceMonitor.ts` - Already has performance tracking utilities with memory snapshots and sync tracking
   - `android/gradle.properties` - Hermes is already set to `hermesEnabled=true`
   - `ios/Podfile` - Hermes configuration exists but may need optimization flags

2. **Build Configuration**:
   - Android build.gradle shows basic configuration but lacks R8 optimization settings
   - iOS configuration present but needs performance-specific build settings

3. **Monitoring Infrastructure**:
   - Logger utility exists at `src/utils/Logger.ts`
   - Network configuration at `src/config/Network.ts` with timeout settings
   - No existing Application Insights integration found

4. **CI/CD Infrastructure**:
   - References to mobile-ci.yml and mobile-build.yml in documentation
   - Jest configuration exists with coverage thresholds

### Top 5 Implementation Pitfalls

1. **Measurement Inconsistency**: Measuring performance on emulators/simulators instead of real devices, leading to inaccurate baselines and false CI passes.

2. **Debug Build Testing**: Forgetting to test performance budgets against release builds with all optimizations enabled, causing production surprises.

3. **Performance Observer Overhead**: Implementing performance monitoring that itself consumes significant resources, skewing the metrics being measured.

4. **Device Tier Ignorance**: Not accounting for low-end device performance, setting budgets based only on high-end devices used by developers.

5. **Overly Aggressive CI Gates**: Setting performance gates too strictly without considering natural variance, causing legitimate builds to fail due to minor fluctuations.

---

## Sub-task 1: Enable and Configure Hermes & R8 Optimizations

**Story Points**: 3

### Acceptance Criteria
1. Hermes JavaScript engine fully enabled and optimized for both iOS and Android release builds
2. R8 code shrinker and optimizer enabled for Android with appropriate ProGuard rules
3. Build size reduced by at least 20% compared to non-optimized builds
4. No runtime crashes or functionality regressions after optimization

### Dependencies
- None (can start immediately)

### Implementation Approach
1. Update Android build configuration to enable R8 with full optimization
2. Configure iOS build settings for Hermes optimization flags
3. Add ProGuard rules to preserve necessary classes and methods
4. Test release builds on multiple devices to ensure stability

### New Code Artifacts

**Files to create:**
- `android/app/proguard-rules.pro` (Update existing) - ProGuard/R8 optimization rules
- `scripts/measure-build-size.sh` - Script to measure and compare build sizes

**Functions to modify:**
- No new functions, configuration changes only

### Expected Outputs
- Optimized release builds for both platforms
- Build size comparison report
- Verification that all app features work correctly

### Testing Requirements
- Full regression test suite on optimized builds
- Performance comparison between debug and release builds
- Test on minimum supported OS versions (iOS 13, Android 8)
- Verify no crashes in production-like scenarios

### Additional Specifications
- Document any features that require ProGuard exceptions
- Ensure source maps are generated for crash reporting
- Maintain separate optimization profiles for staging vs production

---

## Sub-task 2: Integrate react-native-performance Library

**Story Points**: 3

### Acceptance Criteria
1. react-native-performance library installed and configured for both platforms
2. Performance marks added to key app lifecycle events (cold start, screen transitions)
3. Custom performance observer implemented to collect metrics
4. Metrics collection does not impact app performance by more than 1%

### Dependencies
- Sub-task 1 (optimizations should be enabled first)

### Implementation Approach
1. Install and link react-native-performance library
2. Create performance observer service extending existing PerformanceMonitor
3. Add performance marks to App.tsx for cold start measurement
4. Instrument navigation transitions in NavigationProvider
5. Integrate with existing screens (HomeScreen, MyLeadsScreen)

### New Code Artifacts

**Files to create:**
- `src/services/PerformanceObserver.ts` - Service to collect and process performance metrics
- `src/hooks/usePerformanceMark.ts` - Hook for marking performance events
- `src/types/performance.ts` - TypeScript interfaces for all performance metric shapes and telemetry events

**Functions to create:**
- `PerformanceObserver.startColdStartMeasurement(): void` - Begin cold start timing
- `PerformanceObserver.endColdStartMeasurement(): PerformanceMetric` - Complete cold start timing
- `PerformanceObserver.measureScreenTransition(fromScreen: string, toScreen: string): PerformanceMetric` - Measure navigation
- `PerformanceObserver.getMemoryUsage(): MemoryMetric` - Get current memory usage
- `usePerformanceMark(markName: string): void` - Hook to mark performance events

### Expected Outputs
- Performance metrics collected for all key user journeys
- JSON report of performance metrics
- Integration with existing PerformanceMonitor utility

### Testing Requirements
- Unit tests for PerformanceObserver service (85% coverage)
- Integration tests verifying metrics collection
- Performance impact test on both minimum spec (Android 8 with 2GB RAM) and high-end devices to ensure <1% overhead
- Test metrics accuracy against manual measurements
- Validate overhead using before/after memory profiling on reference devices

### Additional Specifications
- Leverage and extend existing PerformanceMonitor.ts utilities and types where possible
- Ensure metrics are collected in production builds only
- Implement sampling to reduce overhead (e.g., collect from 10% of sessions)
- Define all TypeScript interfaces for PerformanceMetric, MemoryMetric, and related types in src/types/performance.ts
- Reuse existing PerformanceMetric interface from PerformanceMonitor.ts if applicable

---

## Sub-task 3: Configure Azure Application Insights Integration

**Story Points**: 4

### Acceptance Criteria
1. Application Insights SDK integrated and configured with instrumentation key from CI/CD secrets
2. Custom events created for performance metrics (cold start, screen transition, memory)
3. Metrics visible in Azure Portal within 5 minutes of app usage
4. Secure configuration following established secret management patterns

### Dependencies
- Sub-task 2 (performance metrics must be collected first)

### Implementation Approach
1. Install Application Insights React Native SDK
2. Create telemetry service to send performance metrics
3. Configure to receive instrumentation key from CI/CD injected environment variables
4. Implement batching to optimize network usage
5. Add error boundaries for telemetry failures

### New Code Artifacts

**Files to create:**
- `src/services/TelemetryService.ts` - Service to send metrics to Application Insights
- `src/config/Telemetry.ts` - Configuration for Application Insights (reads from environment, not hardcoded)
- `src/types/telemetry.ts` - TypeScript interfaces for telemetry events and configuration

**Functions to create:**
- `TelemetryService.initialize(instrumentationKey: string): void` - Initialize App Insights
- `TelemetryService.trackPerformanceMetric(metric: PerformanceMetric): Promise<void>` - Send performance data
- `TelemetryService.trackMemoryMetric(metric: MemoryMetric): Promise<void>` - Send memory data
- `TelemetryService.flush(): Promise<void>` - Force send batched events
- `TelemetryService.setUserId(userId: string): void` - Associate metrics with user

### Expected Outputs
- Performance metrics flowing to Azure Application Insights
- Custom dashboard in Azure Portal showing key metrics
- Documentation of event schema and naming conventions

### Testing Requirements
- Unit tests for TelemetryService (80% coverage)
- Integration test with test Application Insights instance
- Verify metrics appear correctly in Azure Portal
- Test offline behavior and retry logic
- Validate no secrets are stored in source code

### Additional Specifications
- Implement exponential backoff for failed telemetry
- Respect user privacy settings (allow opt-out)
- Use existing error handling patterns from errorMiddleware.ts
- Batch events to reduce network calls
- Instrumentation key must be injected via CI/CD from Azure Key Vault, never committed to source
- Follow existing Config.ts pattern for reading environment variables

---

## Sub-task 4: Create Performance Budget Documentation

**Story Points**: 2

### Acceptance Criteria
1. PERFORMANCE.md document created with detailed budget definitions
2. Budgets specified for cold start (≤3s), screen transition (≤300ms), memory (≤150MB)
3. Testing methodology and device requirements documented
4. Document reviewed and approved by DevOps team

### Dependencies
- Sub-task 3 (need actual metrics to validate budgets)

### Implementation Approach
1. Create comprehensive performance budget document
2. Define measurement methodology and tools
3. Specify device tiers and testing requirements
4. Document CI/CD integration approach
5. Get cross-team review and approval

### New Code Artifacts

**Files to create:**
- `docs/PERFORMANCE.md` - Performance budget and monitoring documentation
- `scripts/performance-budget.json` - Machine-readable budget definitions
- `docs/DEVICE_TESTING_MATRIX.md` - Specific device tiers and testing requirements

**Functions to create:**
- No new functions (documentation task)

### Expected Outputs
- Comprehensive performance documentation
- JSON schema for performance budgets
- DevOps team approval confirmation
- Device testing matrix with minimum and high-end reference devices

### Testing Requirements
- Technical review by senior developers
- DevOps team validation of CI approach
- Verify documentation completeness against acceptance criteria

### Additional Specifications
- Include troubleshooting guide for performance issues
- Document performance testing tools and setup
- Provide examples of good vs bad performance patterns
- Reference existing NFRs from L3-NFRS-CPAPP.md
- Specify testing requirements for both device tiers:
  - Minimum spec: Android 8.0 with 2GB RAM, iOS 13 with iPhone 7
  - High-end: Latest Android/iOS with flagship devices
- Document methodology for validating <1% performance overhead from instrumentation

---

## Sub-task 5: Implement CI Performance Gate

**Story Points**: 4

### Acceptance Criteria
1. CI pipeline runs performance tests on every PR to main/staging/production branches
2. Build fails if any performance budget is exceeded with clear error message
3. Performance report generated and attached to PR comments
4. Gate can be temporarily bypassed with documented justification

### Dependencies
- Sub-task 4 (budgets must be defined)
- Sub-task 2 & 3 (metrics collection must be working)

### Implementation Approach
1. Create performance test script that runs the app and collects metrics
2. Parse metrics and compare against budget thresholds
3. Integrate with existing CI pipeline (mobile-ci.yml)
4. Implement PR comment bot for performance reports
5. Add override mechanism with required justification

### New Code Artifacts

**Files to create:**
- `scripts/ci-performance-check.js` - CI script to validate performance budgets
- `scripts/performance-report-generator.js` - Generate markdown reports
- `.github/workflows/performance-gate.yml` - GitHub Action for performance checks
- `e2e/performance/coldStart.perf.e2e.js` - Detox test for cold start performance
- `e2e/performance/navigation.perf.e2e.js` - Detox test for navigation performance
- `scripts/validate-performance-overhead.js` - Script to measure instrumentation overhead

**Functions to create:**
- `checkPerformanceBudget(metrics: PerformanceMetrics, budget: PerformanceBudget): ValidationResult` - Compare metrics against budget
- `generatePerformanceReport(metrics: PerformanceMetrics, budget: PerformanceBudget): string` - Create markdown report
- `postPRComment(report: string, prNumber: number): Promise<void>` - Post report to PR
- `parsePerformanceMetrics(logFile: string): PerformanceMetrics` - Extract metrics from test logs
- `validateOverhead(baseline: PerformanceMetrics, instrumented: PerformanceMetrics): OverheadReport` - Validate <1% overhead

### Expected Outputs
- Automated performance validation on every PR
- Clear pass/fail status in CI pipeline
- Detailed performance reports in PR comments
- Historical performance trend tracking

### Testing Requirements
- Test CI script with various performance scenarios
- Verify correct pass/fail behavior on both device tiers
- Test override mechanism
- Ensure no false positives in measurements
- Validate overhead measurement accuracy

### Additional Specifications
- Use existing Detox e2e test infrastructure
- Leverage jest-junit reporter pattern for output
- Implement retry logic for flaky measurements
- Store performance history for trend analysis
- Run tests on AWS Device Farm or similar to ensure consistent device specifications
- Include device tier information in performance reports

---

## Sub-task 6: Performance Monitoring Dashboard Setup

**Story Points**: 2

### Acceptance Criteria
1. Azure Application Insights dashboard configured with key performance metrics
2. Alerts configured for performance budget violations
3. Weekly performance report automated to stakeholders
4. Dashboard accessible to development and DevOps teams

### Dependencies
- Sub-task 3 (Application Insights must be sending data)
- Sub-task 5 (CI pipeline generating metrics)

### Implementation Approach
1. Create custom dashboard in Azure Portal with performance widgets
2. Configure alert rules for budget thresholds
3. Set up automated weekly reports via Azure
4. Document dashboard access and interpretation

### New Code Artifacts

**Files to create:**
- `docs/PERFORMANCE_DASHBOARD.md` - Dashboard usage documentation
- `azure/performance-dashboard-template.json` - Azure dashboard configuration

**Functions to create:**
- No new functions (Azure configuration task)

### Expected Outputs
- Live performance dashboard in Azure Portal
- Automated alerts for performance degradation
- Weekly email reports to stakeholders
- Documentation for dashboard usage

### Testing Requirements
- Verify all metrics display correctly
- Test alert triggering with threshold violations
- Confirm weekly reports are delivered
- Validate dashboard performance under load

### Additional Specifications
- Include device breakdown in metrics
- Show performance trends over time
- Integrate with existing Azure Monitor setup
- Ensure RBAC for dashboard access
- Display separate metrics for minimum spec vs high-end devices
- Include instrumentation overhead metrics in dashboard

---

## Integration Testing Approach

After all sub-tasks are complete:

1. **End-to-End Performance Validation**
   - Run full app lifecycle on multiple device tiers (minimum spec and high-end)
   - Verify all metrics are collected and sent correctly
   - Confirm CI gates work as expected
   - Validate instrumentation overhead remains under 1%

2. **Cross-Platform Verification**
   - Test on iOS 13 and Android 8 (minimum supported)
   - Verify Hermes optimizations work on both platforms
   - Check memory usage across different devices

3. **Production Readiness**
   - Deploy to staging environment
   - Monitor for 24 hours to verify metrics flow
   - Conduct load testing to ensure monitoring doesn't impact performance

4. **Documentation Review**
   - Technical review of all documentation
   - DevOps approval of CI/CD changes
   - Update ADRs with performance decisions

## Risk Mitigation

1. **Performance Measurement Variance**: Implement multiple test runs and use statistical analysis
2. **Device Fragmentation**: Test on AWS Device Farm or similar service with documented device matrix
3. **CI Pipeline Complexity**: Keep performance checks in separate workflow initially
4. **Data Privacy**: Ensure no PII in performance metrics
5. **Cost Management**: Monitor Application Insights usage to avoid bill surprises