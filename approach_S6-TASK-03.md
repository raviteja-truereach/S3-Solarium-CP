## Pre-Analysis Phase

Based on the current codebase analysis, I've identified the following patterns and components to leverage:

1. **Existing Services Pattern**: The codebase already has `TelemetryService.ts` using Azure Application Insights, which provides a pattern for integrating Firebase Crashlytics
2. **Configuration Management**: `Config.ts` and environment-based configuration system for Firebase keys
3. **Preferences Storage**: `preferencesSlice.ts` can be extended for analytics consent
4. **Logger Utility**: Existing `Logger.ts` with production console stripping
5. **CI/CD Pipeline**: Existing GitHub Actions workflows that can be extended for dSYM/ProGuard mapping uploads

### Top 5 Implementation Pitfalls

1. **Logging Sensitive Data**: Accidentally including JWT tokens, phone numbers, or other PII in crash logs or custom properties
2. **Initialization Race Conditions**: Firebase Crashlytics must be initialized before any crashes can be caught, but after the app has loaded enough to read user preferences
3. **Mapping File Upload Failures**: Not properly configuring CI to upload dSYM (iOS) and ProGuard mappings (Android), resulting in obfuscated, unreadable crash reports
4. **Analytics Without Consent**: Firing analytics events before checking user consent, potentially violating privacy policies
5. **Build Size Bloat**: Not properly configuring ProGuard rules for Firebase, causing unnecessary increase in app size beyond the 1MB limit

## Implementation Backlog

### Sub-task 1: Firebase SDK Integration and Configuration
**Story Points**: 3

**Acceptance Criteria**:
- Firebase Crashlytics SDK successfully integrated for both iOS and Android
- Firebase Analytics SDK successfully integrated for both iOS and Android
- google-services.json (Android) and GoogleService-Info.plist (iOS) files properly configured
- Build completes successfully with Firebase dependencies
- Environment variables configured for Firebase project IDs

**Dependencies**: None

**Implementation Approach**:
1. Install Firebase dependencies via npm/yarn (both crashlytics and analytics)
2. Configure native platform files for iOS (Podfile, Info.plist)
3. Configure native platform files for Android (build.gradle files)
4. Add Firebase configuration files to appropriate directories
5. Update .gitignore to exclude Firebase config files
6. Create environment variable configuration for Firebase keys

**New Code Artifacts**:
- Files:
  - `android/app/google-services.json` - Firebase Android configuration
  - `ios/cpapp/GoogleService-Info.plist` - Firebase iOS configuration
  - `src/services/CrashlyticsService.ts` - Crashlytics service wrapper (crash reporting only)
  - `src/services/AnalyticsService.ts` - Analytics service wrapper (business events)
  - `src/types/crashlytics.ts` - TypeScript types for Crashlytics
  - `src/types/analytics.ts` - TypeScript types for Analytics
- Functions:
  - `CrashlyticsService.initialize(): Promise<void>` - Initialize Crashlytics
  - `CrashlyticsService.setUserId(userId: string): void` - Set user context
  - `CrashlyticsService.log(message: string): void` - Log custom messages
  - `AnalyticsService.initialize(): Promise<void>` - Initialize Analytics
  - `AnalyticsService.setUserId(userId: string): void` - Set analytics user ID

**Expected Outputs**:
- Firebase SDK integrated without build errors
- App launches successfully with Firebase initialized

**Testing Requirements**:
- Unit tests for CrashlyticsService methods
- Unit tests for AnalyticsService methods
- Integration test verifying Firebase initialization
- Manual verification of successful app launch on both platforms

**Additional Specifications**:
- Ensure Firebase config files are added to CI secret management
- ProGuard rules must be added to preserve Firebase classes

### Sub-task 2: User Consent Management for Analytics
**Story Points**: 3

**Acceptance Criteria**:
- Analytics consent preference stored in Redux state
- Settings screen shows analytics consent toggle
- Default consent state is ON as per policy
- Analytics events respect user consent preference
- Consent changes are persisted across app restarts
- Crash reporting remains always enabled regardless of analytics consent

**Dependencies**: Sub-task 1 (Firebase integration)

**Implementation Approach**:
1. Extend preferences slice to include analyticsConsent field
2. Add analytics consent UI component to Settings screen
3. Create selector for analytics consent state
4. Implement consent checking in AnalyticsService (not CrashlyticsService)
5. Ensure consent is loaded before any analytics events fire
6. Document that crash reporting is always-on for critical incidents

**New Code Artifacts**:
- Files:
  - `src/components/settings/AnalyticsConsentToggle.tsx` - Consent UI component
- Functions:
  - `preferencesSlice.setAnalyticsConsent(consent: boolean)` - Redux action
  - `selectAnalyticsConsent(state: RootState): boolean` - Redux selector
  - `AnalyticsService.setAnalyticsCollectionEnabled(enabled: boolean): void` - Toggle analytics
  - `AnalyticsService.isAnalyticsEnabled(): boolean` - Check consent status

**Expected Outputs**:
- Analytics consent toggle visible in Settings
- Consent preference persists across app restarts
- Analytics respects user preference
- Crash reporting always enabled

**Testing Requirements**:
- Unit tests for Redux consent actions and selectors
- UI tests for consent toggle interaction
- Integration tests verifying analytics enable/disable behavior
- Test persistence across app restarts
- Verify crash reporting remains active when analytics disabled

### Sub-task 3: App Initialization Sequencing and Crash Reporting
**Story Points**: 4

**Acceptance Criteria**:
- Consent state loaded before any SDK initialization
- Crashes are captured with correct stack traces
- User ID (cpId) is attached to crash reports after login
- No PII or JWT tokens appear in crash logs
- Test crash can be triggered from dev menu
- Crash reports visible in Firebase Console

**Dependencies**: Sub-task 1, Sub-task 2

**Implementation Approach**:
1. Modify AppInitializer component to load consent state first
2. Initialize Crashlytics (always) and Analytics (if consent enabled) after consent load
3. Add cpId setting after successful login in OtpScreen
4. Document PII filtering limitations for native crashes
5. Add test crash trigger to development menu
6. Integrate with existing error handling middleware

**New Code Artifacts**:
- Functions:
  - `CrashlyticsService.recordError(error: Error, context?: Record<string, any>): void` - Record non-fatal errors
  - `CrashlyticsService.setCustomKeys(keys: Record<string, string>): void` - Set crash context
  - `CrashlyticsService.testCrash(): void` - Trigger test crash
  - `sanitizeCustomCrashKeys(keys: Record<string, any>): Record<string, any>` in `src/utils/crashSanitizer.ts` - Strip PII from custom keys only
  - `AppInitializer.loadConsentAndInitializeSDKs(): Promise<void>` - Sequential initialization
  - `AppInitializer.waitForConsentState(): Promise<boolean>` - Wait for consent load

**Expected Outputs**:
- Crashes captured with readable stack traces
- User context (cpId) visible in crash reports
- No sensitive data in custom crash properties

**Testing Requirements**:
- Unit tests for custom key sanitization
- Integration test for initialization sequencing
- Manual test of crash trigger and report verification
- Verify no PII in custom crash properties

**Additional Specifications**:
- Add code comments clarifying that native stack traces cannot be filtered
- Document that only custom logs/keys are sanitized, not native crash data

### Sub-task 4: Analytics Events Implementation
**Story Points**: 3

**Acceptance Criteria**:
- Login event fired after successful OTP verification
- Lead creation event fired after successful lead submission
- Commission view event fired when commission list accessed
- Events include relevant non-PII context
- Events only fire when analytics consent is enabled
- Events recorded in Firebase Analytics (not Crashlytics)

**Dependencies**: Sub-task 2, Sub-task 3

**Implementation Approach**:
1. Create analytics event constants and types
2. Implement event firing in OtpScreen for login using AnalyticsService
3. Implement event firing in AddLeadScreen for lead creation using AnalyticsService
4. Implement event firing in future CommissionsScreen using AnalyticsService
5. Add event context without PII
6. Ensure all events check consent before firing

**New Code Artifacts**:
- Files:
  - `src/constants/analytics.ts` - Analytics event names and properties
- Functions:
  - `AnalyticsService.logEvent(eventName: string, parameters?: Record<string, any>): void` - Log analytics event with consent check
  - `AnalyticsService.logLogin(): void` - Specific login event
  - `AnalyticsService.logLeadCreated(leadId: string): void` - Specific lead event
  - `AnalyticsService.logCommissionView(): void` - Specific commission view event
  - `logLoginEvent(): void` in OtpScreen (calls AnalyticsService)
  - `logLeadCreatedEvent(leadId: string): void` in AddLeadScreen (calls AnalyticsService)
  - `logCommissionViewEvent(): void` in future CommissionsScreen (calls AnalyticsService)

**Expected Outputs**:
- Events visible in Firebase Analytics dashboard (not Crashlytics)
- Events contain appropriate context
- No events when consent disabled

**Testing Requirements**:
- Unit tests for event logging with consent checks
- Integration tests for each event scenario
- Manual verification of events in Firebase Analytics Console
- Test event suppression when consent disabled

### Sub-task 5: CI/CD Configuration for Symbol Uploads
**Story Points**: 3

**Acceptance Criteria**:
- iOS dSYM files uploaded automatically on release builds
- Android ProGuard mappings uploaded on release builds
- Upload failures fail the CI build
- Symbol files associated with correct app version

**Dependencies**: Sub-task 1

**Implementation Approach**:
1. Configure Fastlane for iOS dSYM uploads
2. Configure Gradle for Android mapping uploads
3. Add Firebase CLI to CI environment
4. Create upload scripts for both platforms
5. Integrate uploads into existing CI workflows

**New Code Artifacts**:
- Files:
  - `scripts/upload-symbols-ios.sh` - iOS symbol upload script
  - `scripts/upload-symbols-android.sh` - Android mapping upload script
  - `fastlane/Fastfile` updates - dSYM upload lane
  - `.github/workflows/mobile-ci.yml` updates - Symbol upload steps
- Functions:
  - `upload_dsym_to_crashlytics` - Fastlane action
  - `uploadCrashlyticsSymbolFile` - Gradle task

**Expected Outputs**:
- Symbols uploaded automatically during CI builds
- Crash reports show deobfuscated stack traces
- CI fails if upload fails

**Testing Requirements**:
- Test symbol upload in CI pipeline
- Verify crash report readability after upload
- Test CI failure on upload error

### Sub-task 6: Azure Monitor and Slack Integration
**Story Points**: 4

**Acceptance Criteria**:
- High-severity crashes trigger Azure Monitor alerts
- Alerts forwarded to configured Slack channel
- Alert includes crash summary and affected version
- Alerts arrive within 2 minutes of crash
- Test alert can be triggered manually

**Dependencies**: Sub-task 3, Sub-task 4

**Implementation Approach**:
1. Create Azure Function to receive Firebase webhooks
2. Configure Firebase to send crash alerts to Azure Function
3. Implement crash severity filtering in Azure Function
4. Create Azure Monitor alert rule for high-severity crashes
5. Configure Slack webhook integration
6. Add monitoring dashboard in Azure

**New Code Artifacts**:
- Files:
  - `azure/functions/crash-webhook-handler.ts` - Azure Function for webhooks
  - `azure/alerts/high-severity-crash-alert.json` - Alert rule configuration
  - `scripts/setup-crash-alerts.ps1` - PowerShell setup script
- Functions:
  - `handleCrashlyticsWebhook(request: HttpRequest): Promise<HttpResponse>` - Webhook handler
  - `forwardToSlack(crashData: CrashReport): Promise<void>` - Slack forwarder
  - `filterHighSeverityCrashes(crash: CrashReport): boolean` - Severity filter

**Expected Outputs**:
- Azure Function deployed and receiving webhooks
- Slack alerts for high-severity crashes
- Azure Monitor dashboard showing crash metrics

**Testing Requirements**:
- Integration test for webhook handler
- Test alert flow from crash to Slack
- Verify 2-minute SLA for alerts
- Test filtering of low-severity crashes

**Additional Specifications**:
- Ensure webhook endpoint is secured with authentication
- Configure retry logic for Slack webhook failures
- Add runbook for alert response procedures