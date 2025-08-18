# Implementation Backlog: Mobile Security Hardening & Protected Release Builds

## Pre-Analysis Phase

### Analysis of Current Codebase

Based on the codebase analysis:

1. **Existing Security Patterns**:
   - JWT storage using `KeychainHelper.ts` for secure token management
   - Basic ProGuard rules already configured in `android/app/proguard-rules.pro`
   - `AuthGuard` component for route protection
   - `errorMiddleware` handling authentication failures
   - Screen security utilities mentioned (`screenSecurity.ts` and `ScreenCaptureWarning.tsx`)

2. **Network Layer**:
   - RTK Query with custom `baseQuery.ts` handling timeouts and retries
   - Direct production URL hardcoded in baseQuery
   - No certificate pinning currently implemented

3. **Build Configuration**:
   - Fastlane setup exists for both platforms
   - CI pipelines in place (`mobile-ci.yml`)
   - Environment-specific configurations using react-native-config

4. **Key Integration Points**:
   - `src/store/api/baseQuery.ts` - where SSL pinning will be integrated
   - `src/screens/auth/OtpScreen.tsx` and `src/screens/settings/SettingsScreen.tsx` - sensitive screens
   - `babel.config.js` and `metro.config.js` - for build optimizations

### Top 5 Implementation Pitfalls

1. **Breaking Network Calls with Incorrect Certificate Pinning**
   - Risk: Hardcoding wrong certificate pins or not handling certificate rotation properly
   - Prevention: Test thoroughly with staging/production certificates, implement pin backup strategy

2. **Over-aggressive ProGuard/R8 Rules Breaking React Native**
   - Risk: Obfuscating React Native internals, causing runtime crashes
   - Prevention: Use proven ProGuard rules for React Native, test release builds extensively

3. **Blocking Legitimate Users with Root Detection**
   - Risk: False positives preventing app usage on custom ROMs or developer devices
   - Prevention: Implement as warning-only, never block functionality

4. **Console Logs Removal Breaking Error Reporting**
   - Risk: Removing all logs including error tracking/telemetry
   - Prevention: Preserve error logging while removing debug logs

5. **Certificate Pinning Breaking Hot Updates**
   - Risk: CodePush or OTA updates failing due to certificate mismatches
   - Prevention: Test update scenarios, consider pinning only for API calls

---

## Implementation Backlog

### SUB-TASK-1: Configure Android Build Obfuscation & Optimization
**Story Points**: 3

**Acceptance Criteria**:
- R8/ProGuard enabled for release builds with proper rules
- Resource shrinking enabled without breaking assets
- Build size reduced by at least 20%
- No runtime crashes in obfuscated builds
- Mapping files generated and stored

**Dependencies**:
- Existing `android/app/proguard-rules.pro` file
- Android build.gradle configuration

**Implementation Approach**:
1. Update `android/app/build.gradle` to enable R8 and resource shrinking
2. Enhance ProGuard rules in `proguard-rules.pro` for React Native 0.71.x compatibility
3. Add rules for all third-party libraries (React Navigation, Redux, etc.)
4. Configure mapping file output location
5. Test release build thoroughly with all app features

**New Code Artifacts**:
- Modified: `android/app/build.gradle` (minifyEnabled, shrinkResources configuration)
- Modified: `android/app/proguard-rules.pro` (comprehensive R8 rules)
- New: `android/app/r8-config.pro` (additional R8-specific optimizations)

**Expected Outputs**:
- Obfuscated AAB file with reduced size
- Mapping files in `android/app/build/outputs/mapping/release/`
- No functional regressions

**Testing Requirements**:
- Manual testing of all app flows in release build
- Automated UI tests on release build
- Size comparison before/after
- Verify mapping file can decode stack traces

**Additional Specifications**:
- Keep development builds unobfuscated for debugging
- Ensure source maps work with crash reporting tools

---

### SUB-TASK-2: Configure iOS Build Optimization
**Story Points**: 2

**Acceptance Criteria**:
- Dead code stripping enabled
- Bitcode enabled for App Store optimization
- Build size optimized
- No runtime issues
- dSYM files properly generated

**Dependencies**:
- Xcode project configuration
- iOS build settings

**Implementation Approach**:
1. Update iOS build settings in Xcode project
2. Enable dead code stripping and optimization flags
3. Configure dSYM generation for crash reporting
4. Update Podfile for release optimizations
5. Test release build on physical devices

**New Code Artifacts**:
- Modified: `ios/cpapp.xcodeproj/project.pbxproj` (build settings)
- Modified: `ios/Podfile` (optimization flags for pods)
- New: `ios/scripts/strip-debug-symbols.sh` (post-build script)

**Expected Outputs**:
- Optimized IPA file
- dSYM files for symbolication
- Reduced app size

**Testing Requirements**:
- TestFlight beta testing
- Performance profiling
- Memory usage analysis
- Crash reporting verification

---

### SUB-TASK-3: Implement TLS Certificate Pinning
**Story Points**: 4

**Acceptance Criteria**:
- SSL pinning implemented for all API calls
- Environment-specific pins (staging/production)
- Graceful error handling for pin mismatches with integration to existing errorMiddleware
- Pin rotation strategy documented with rollback procedures
- No impact on existing network functionality (regression tested)
- Certificate pin update process with staged rollout capability

**Dependencies**:
- Current `baseQuery.ts` implementation
- Backend SSL certificates (SHA-256 hashes needed)
- Existing `errorMiddleware.ts` for error handling integration

**Implementation Approach**:
1. Install and configure react-native-ssl-pinning
2. Obtain certificate hashes for staging and production
3. Modify `baseQuery.ts` to use pinned fetch with fallback mechanism
4. Implement pin validation with proper error messages integrated with errorMiddleware
5. Add configuration for pin updates with feature flag support
6. Create pin rotation procedures and rollback plan
7. Test with valid and invalid certificates
8. Implement regression test suite for all existing API endpoints

**New Code Artifacts**:
- New: `src/config/CertificatePins.ts` (pin configuration by environment)
  ```typescript
  interface CertificatePin {
    hostname: string;
    pin: string;
    backupPin?: string;
    expiryDate: string;
  }
  
  interface CertificatePinConfig {
    staging: CertificatePin[];
    production: CertificatePin[];
  }
  
  export const getCertificatePins: (env: string) => CertificatePin[];
  export const validatePin: (hostname: string, pin: string) => boolean;
  ```
- Modified: `src/store/api/baseQuery.ts` (integrate SSL pinning)
- New: `src/utils/security/SSLPinning.ts` (pinning utilities and helpers)
  ```typescript
  export interface SSLPinningOptions {
    pins: CertificatePin[];
    allowInvalidCertificates?: boolean;
    validateDomainName?: boolean;
  }
  
  export const createPinnedFetch: (options: SSLPinningOptions) => typeof fetch;
  export const handlePinningError: (error: Error) => void;
  ```
- New: `src/types/ssl-pinning.d.ts` (TypeScript definitions)
- New: `scripts/rotate-certificate-pins.sh` (operational script for pin rotation)
- New: `docs/CERTIFICATE_PIN_ROTATION.md` (rotation procedures and rollback plan)

**Expected Outputs**:
- Network calls succeed with correct pins
- Clear error messages for pin mismatches via toast notifications
- No regression in API functionality
- Pin rotation runbook with rollback procedures

**Testing Requirements**:
- Unit tests for pin validation logic
- Integration tests with mock certificates
- Manual testing with MITM proxy (should fail)
- Test certificate rotation scenario
- Regression test suite covering all API endpoints:
  - Auth endpoints (OTP request/verify)
  - Lead management endpoints
  - Document upload endpoints
  - Dashboard data endpoints
- Error flow testing:
  - Pin mismatch error handling
  - Network timeout with pinning
  - Certificate expiry scenarios

**Additional Specifications**:
- Store backup pins for certificate rotation
- Consider public key pinning vs certificate pinning
- Document pin update process with feature flag approach
- Implement monitoring for pin validation failures
- Create operational runbook for emergency pin updates

---

### SUB-TASK-4: Implement Root/Jailbreak Detection
**Story Points**: 3

**Acceptance Criteria**:
- Root/jailbreak detection working on both platforms
- Warning overlay displayed on compromised devices with accessibility support
- No blocking of app functionality
- Detection cannot be easily bypassed
- User can dismiss warning and continue
- Overlay is accessible to screen readers with proper ARIA labels
- Integration with existing error handling patterns

**Dependencies**:
- None (new feature)
- Existing ErrorBoundary pattern for error handling

**Implementation Approach**:
1. Integrate jail-monkey or react-native-device-info for detection
2. Create RootDetectionService with platform-specific checks
3. Design SecurityWarningOverlay component following existing UI patterns and accessibility standards
4. Integrate detection at app startup
5. Add analytics tracking for compromised devices
6. Implement error boundary for detection failures

**New Code Artifacts**:
- New: `src/services/RootDetectionService.ts` (detection logic)
  ```typescript
  export interface RootDetectionResult {
    isRooted: boolean;
    detectionMethods: string[];
    confidence: 'high' | 'medium' | 'low';
  }
  
  export class RootDetectionService {
    static async checkDeviceSecurity(): Promise<RootDetectionResult>;
    static async checkRootedAndroid(): Promise<boolean>;
    static async checkJailbrokenIOS(): Promise<boolean>;
  }
  ```
- New: `src/components/security/SecurityWarningOverlay.tsx` (warning UI)
  ```typescript
  interface SecurityWarningOverlayProps {
    visible: boolean;
    onDismiss: () => void;
    testID?: string;
  }
  
  export const SecurityWarningOverlay: React.FC<SecurityWarningOverlayProps>;
  ```
- New: `src/hooks/useDeviceSecurity.ts` (hook for security status)
  ```typescript
  interface DeviceSecurityState {
    isChecking: boolean;
    isCompromised: boolean;
    error: Error | null;
    dismissWarning: () => void;
  }
  
  export const useDeviceSecurity: () => DeviceSecurityState;
  ```
- Modified: `App.tsx` (integrate security check)
- New: `src/components/security/SecurityErrorBoundary.tsx` (error boundary for security features)

**Expected Outputs**:
- Warning displayed on rooted/jailbroken devices
- Analytics events for security status
- No functional blocking
- Accessible warning overlay

**Testing Requirements**:
- Test on rooted Android emulator
- Test on jailbroken iOS simulator (if available)
- Verify detection methods
- Test dismissal flow
- Accessibility testing:
  - Screen reader compatibility
  - Keyboard navigation
  - Focus management
  - ARIA labels and roles
- Error scenario testing:
  - Detection service timeout
  - Detection service crash
  - Async loading states

**Additional Specifications**:
- Log detection results for analytics
- Consider A/B testing warning messages
- Plan for future security policies
- Ensure overlay follows Material Design accessibility guidelines
- Maintain local state only (no Redux integration needed)

---

### SUB-TASK-5: Implement Secure Screenshot Protection
**Story Points**: 2

**Acceptance Criteria**:
- Screenshots blocked on OTP screen
- Screenshots blocked on Settings/Profile screen
- Platform-specific implementation working
- No impact on other screens
- Visual feedback when screenshot attempted (iOS)
- Error handling for protection failures

**Dependencies**:
- Existing screen components
- Platform-specific APIs

**Implementation Approach**:
1. Create useScreenSecurity hook
2. Implement Android FLAG_SECURE
3. Implement iOS screenshot detection
4. Apply to sensitive screens
5. Add visual feedback component
6. Handle protection failure gracefully

**New Code Artifacts**:
- New: `src/hooks/useScreenSecurity.ts` (screenshot protection hook)
  ```typescript
  interface ScreenSecurityOptions {
    preventScreenshot: boolean;
    preventRecording: boolean;
    onScreenshotAttempt?: () => void;
  }
  
  export const useScreenSecurity: (options: ScreenSecurityOptions) => void;
  ```
- New: `src/utils/screenSecurity.ts` (platform-specific implementation)
  ```typescript
  export const enableSecureScreen: () => void;
  export const disableSecureScreen: () => void;
  export const addScreenshotListener: (callback: () => void) => () => void;
  ```
- Modified: `src/screens/auth/OtpScreen.tsx` (apply protection)
- Modified: `src/screens/settings/SettingsScreen.tsx` (apply protection)

**Expected Outputs**:
- Screenshots blocked on sensitive screens
- User feedback on screenshot attempts
- No regression on other screens

**Testing Requirements**:
- Manual screenshot testing on both platforms
- Verify screen recording also blocked
- Test screen transitions
- Accessibility testing
- Error flow testing:
  - Protection API failure handling
  - Platform version compatibility

---

### SUB-TASK-6: Remove Console Logs in Release Builds
**Story Points**: 2

**Acceptance Criteria**:
- All console.* statements removed from release bundles
- Error logging preserved for crash reporting
- Development builds retain all logs
- No impact on debugging capability
- Bundle size slightly reduced

**Dependencies**:
- Babel configuration
- Metro bundler setup

**Implementation Approach**:
1. Install babel-plugin-transform-remove-console
2. Configure for production builds only
3. Preserve console.error for crash reporting
4. Update babel.config.js with environment check
5. Verify in release bundle

**New Code Artifacts**:
- Modified: `babel.config.js` (add console removal plugin)
- New: `src/utils/Logger.ts` (custom logger for important logs)
  ```typescript
  export interface Logger {
    debug: (message: string, extra?: any) => void;
    info: (message: string, extra?: any) => void;
    warn: (message: string, extra?: any) => void;
    error: (message: string, extra?: any) => void;
  }
  
  export const createLogger: (tag: string) => Logger;
  ```
- Modified: `metro.config.js` (optimization settings)

**Expected Outputs**:
- No console logs in release JavaScript bundle
- Reduced bundle size
- Error tracking still functional

**Testing Requirements**:
- Inspect release bundle for console statements
- Verify error reporting still works
- Check development builds retain logs
- Performance testing

---

### SUB-TASK-7: Update CI/CD for Secure Builds
**Story Points**: 3

**Acceptance Criteria**:
- CI pipeline produces signed, obfuscated builds
- Mapping files securely uploaded to artifact storage
- Environment-specific certificate pins injected
- Build artifacts properly versioned
- Automated security checks in pipeline
- Pin rotation support in build process

**Dependencies**:
- Existing Fastlane configuration
- GitHub Actions workflows
- Code signing certificates

**Implementation Approach**:
1. Update Fastlane to enable obfuscation
2. Configure artifact upload for mapping files
3. Add build-time certificate pin injection with environment detection
4. Implement security scanning step
5. Update GitHub Actions workflow
6. Add certificate pin validation in build process

**New Code Artifacts**:
- Modified: `fastlane/Fastfile` (obfuscation settings)
- Modified: `.github/workflows/mobile-ci.yml` (security steps)
- New: `scripts/inject-certificate-pins.sh` (build-time injection)
  ```bash
  # Injects environment-specific certificate pins
  # Usage: ./inject-certificate-pins.sh [staging|production]
  ```
- New: `scripts/upload-mapping-files.sh` (secure upload)
- New: `scripts/validate-certificate-pins.sh` (pre-build validation)

**Expected Outputs**:
- Automated secure build generation
- Mapping files in secure storage
- Security scan reports
- Signed release artifacts

**Testing Requirements**:
- Full CI pipeline run
- Verify mapping file upload
- Test build artifact integrity
- Security scan validation
- Certificate pin injection verification

**Additional Specifications**:
- Implement build versioning strategy
- Set up alerts for security scan failures
- Document build artifact retrieval
- Create build-time pin rotation capability

---

### SUB-TASK-8: Integration Testing & Security Validation
**Story Points**: 3

**Acceptance Criteria**:
- All security features working together
- No performance degradation
- Security audit checklist completed
- Penetration testing scenarios documented
- Release candidate approved
- All existing features regression tested
- Accessibility verified for security UI components

**Dependencies**:
- All previous sub-tasks completed
- Testing devices/emulators available

**Implementation Approach**:
1. Create comprehensive security test suite
2. Perform integration testing of all features
3. Conduct security audit
4. Document security testing procedures
5. Create security runbook
6. Execute full regression test suite
7. Validate accessibility compliance

**New Code Artifacts**:
- New: `__tests__/security/SecurityIntegration.test.ts` (integration tests)
  ```typescript
  describe('Security Integration Tests', () => {
    test('SSL pinning with root detection');
    test('Screenshot protection during security warning');
    test('Error handling for security failures');
    test('Performance impact of security features');
  });
  ```
- New: `docs/SECURITY_TESTING.md` (testing procedures)
- New: `docs/SECURITY_RUNBOOK.md` (operational guide including pin rotation)
- New: `e2e/security/securityFeatures.e2e.ts` (E2E security tests)
- New: `__tests__/security/NetworkRegression.test.ts` (API regression tests)

**Expected Outputs**:
- Complete test results
- Security audit report
- Performance benchmarks
- Release readiness confirmation
- Regression test report

**Testing Requirements**:
- Full regression testing of all existing features
- Security-specific test cases:
  - Certificate pinning with all API endpoints
  - Root detection on various devices
  - Screenshot protection verification
  - Console log removal validation
- Performance profiling
- Third-party security scan
- Accessibility audit for security components
- Error flow validation:
  - Network failures with pinning
  - Security service failures
  - Graceful degradation scenarios

**Additional Specifications**:
- Create security checklist for future releases
- Document known limitations
- Plan for security updates
- Create monitoring dashboard for security events

---

## Execution Order and Dependencies

1. **Phase 1 - Build Configuration** (Parallel)
   - SUB-TASK-1: Android Obfuscation
   - SUB-TASK-2: iOS Optimization
   - SUB-TASK-6: Console Log Removal

2. **Phase 2 - Security Features** (Sequential)
   - SUB-TASK-3: Certificate Pinning
   - SUB-TASK-4: Root Detection
   - SUB-TASK-5: Screenshot Protection

3. **Phase 3 - CI/CD and Testing** (Sequential)
   - SUB-TASK-7: CI/CD Updates
   - SUB-TASK-8: Integration Testing

## Risk Mitigation

- Keep unobfuscated builds for QA testing initially
- Implement feature flags for security features
- Maintain rollback plan for certificate pins
- Document all security configurations
- Create monitoring for security-related errors
- Establish certificate pin rotation procedures with staged rollout
- Ensure all security UI components meet accessibility standards
- Maintain comprehensive regression test suite for network calls