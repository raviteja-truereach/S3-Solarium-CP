# CI/CD Pipeline Documentation

## Overview

The Solarium CP App uses GitHub Actions for continuous integration and deployment, providing automated builds, testing, and quality checks.

## Workflows

### 1. Mobile CI/CD Pipeline (`.github/workflows/mobile-ci.yml`)

**Triggers:**
- Push to `main`, `staging`, `production` branches
- Pull requests to protected branches
- Manual workflow dispatch

**Jobs:**
1. **Environment Validation** - Validates environment files and configuration
2. **Code Quality** - Runs linting, type checking, and tests with coverage
3. **Security Scan** - Scans for secrets and vulnerabilities using Gitleaks
4. **Android Build** - Builds Android debug APK using Fastlane
5. **iOS Build** - Builds iOS debug app using Fastlane (macOS runner)
6. **Notification** - Summarizes build results

### 2. Pull Request Checks (`.github/workflows/pr-check.yml`)

**Purpose:** Validates changes before merge

**Checks:**
- Environment file validation
- Code linting and type checking
- Unit test execution
- TODO/FIXME comment detection
- Coverage reporting

### 3. Release Build (`.github/workflows/release.yml`)

**Triggers:**
- Git tags matching `v*` pattern
- Manual workflow dispatch

**Actions:**
- Builds production-ready artifacts
- Creates GitHub release
- Uploads release assets

## Environment Configuration

### Environment Files

Each environment requires a corresponding `.env.*` file:
- `.env.development` - Development builds
- `.env.staging` - Staging builds  
- `.env.production` - Production builds

### Branch Mapping

| Branch | Environment | Build Type |
|--------|-------------|------------|
| `main` | development | Debug |
| `staging` | staging | Debug |
| `production` | production | Release |

## Secrets Configuration

### Required Secrets

#### Azure Key Vault (Recommended)

AZURE_CLIENT_ID - Service principal client ID AZURE_TENANT_ID - Azure tenant ID AZURE_SUBSCRIPTION_ID - Azure subscription ID
AZURE_KEY_VAULT_NAME - Key vault name


#### Direct Secrets (Alternative)
ANDROID_KEYSTORE_PASSWORD - Android keystore password GOOGLE_PLAY_SERVICE_ACCOUNT - Google Play service account JSON IOS_CERTIFICATE_PASSWORD - iOS certificate password APP_STORE_CONNECT_API_KEY - App Store Connect API key


#### Optional Secrets
SONAR_TOKEN - SonarQube authentication token SONAR_HOST_URL - SonarQube server URL SLACK_WEBHOOK_URL - Slack notification webhook


## Build Artifacts

### Android
- Debug APK: `android-debug-{environment}.apk`
- Release APK: `android-release-{environment}.apk`

### iOS  
- Debug IPA: `ios-debug-{environment}.ipa`
- Release IPA: `ios-release-{environment}.ipa`
- Simulator builds: `.app` bundles

### Coverage Reports
- HTML coverage report
- LCOV format for external tools
- Coverage badges

## Manual Workflow Dispatch

Trigger builds manually from GitHub Actions tab:

1. Go to "Actions" tab in GitHub repository
2. Select "Mobile CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select environment (development/staging/production)
5. Click "Run workflow"

## Troubleshooting

### Common Issues

#### Build Failures
- **ENVFILE not set**: Ensure environment validation passes
- **Dependency issues**: Check if `yarn install` succeeds
- **Signing failures**: Verify certificates are available in Key Vault

#### iOS-Specific Issues
- **CocoaPods failures**: Check pod installation logs
- **Xcode issues**: Verify Xcode version compatibility
- **Simulator builds**: Expected fallback when signing unavailable

#### Android-Specific Issues
- **Gradle failures**: Check Java version and Gradle cache
- **Keystore issues**: Verify keystore configuration
- **SDK issues**: Ensure Android SDK is properly configured

### Debug Steps

1. **Check workflow logs** in GitHub Actions tab
2. **Verify environment files** contain required variables
3. **Test locally** using same commands as CI
4. **Check secrets configuration** in repository settings

## Performance Optimization

### Caching Strategy
- Node.js dependencies cached by yarn.lock hash
- Gradle dependencies cached by Gradle files hash
- CocoaPods cached by Podfile.lock hash
- Ruby gems cached automatically

### Build Optimization
- Parallel job execution where possible
- Conditional steps skip when secrets unavailable
- Artifact retention limited to 30 days
- Failed jobs provide detailed error context