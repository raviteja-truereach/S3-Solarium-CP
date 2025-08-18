# Fastlane Configuration

Fastlane automation for Solarium CP App builds and deployments.

## Prerequisites

- Fastlane installed (`gem install fastlane`)
- Android SDK configured
- Environment files (.env.development, .env.staging, .env.production)

## Usage

### Environment Selection

All Fastlane lanes require an ENVFILE parameter:

```bash
# Development build
ENVFILE=.env.development fastlane android_debug

# Staging build  
ENVFILE=.env.staging fastlane android_debug

# Production internal build
ENVFILE=.env.production fastlane android_internal

Available Lanes
Android Lanes
android_debug - Build debug APK
android_internal - Build release APK and upload to Google Play Internal
upload_internal - Upload existing APK to Google Play Internal
build_release - Build signed release APK (no upload)
Global Lanes
info - Display environment information
clean - Clean build artifacts
Examples
# Build debug APK for development
ENVFILE=.env.development fastlane android_debug

# Build and upload to Google Play Internal (staging)
ENVFILE=.env.staging fastlane android_internal

# Build release APK for production (no upload)
ENVFILE=.env.production fastlane build_release

# Clean all build artifacts
ENVFILE=.env.development fastlane clean
Using Build Scripts
# Build development debug
./scripts/build-android.sh development debug

# Build staging internal
./scripts/build-android.sh staging internal

# Build production internal
./scripts/build-android.sh production internal
Configuration
Environment Files
.env.development - Development configuration
.env.staging - Staging configuration
.env.production - Production configuration
Android Configuration
android/fastlane/.env.default - Android build settings
android/keystores/ - Signing keystores
Google Play Configuration
Set these environment variables for Google Play uploads:

GOOGLE_PLAY_JSON_KEY_PATH=path/to/service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.solarium.cpapp
Output
Built APKs are saved to fastlane/builds/ with timestamps:

android-debug-[env]-[timestamp].apk
android-release-[env]-[timestamp].apk
Troubleshooting
Missing ENVFILE Error
❌ ENVFILE is missing – aborting build.
Solution: Always provide ENVFILE parameter:

ENVFILE=.env.development fastlane android_debug
Keystore Not Found
⚠️ Release keystore not found
🔄 Falling back to debug signing
Solution: Configure release keystore or use debug builds for testing.

Google Play Upload Failed
Solution: Check Google Play service account JSON key configuration.

## iOS Lanes

### Available iOS Lanes

- `ios_debug` - Build debug app for simulator/device
- `ios_beta` - Build release and upload to TestFlight  
- `upload_testflight` - Upload existing IPA to TestFlight
- `build_release` - Build signed release IPA (no upload)
- `setup_signing` - Setup code signing with Match
- `pods` - Install CocoaPods dependencies

### iOS Examples

```bash
# Build iOS debug for development
ENVFILE=.env.development fastlane ios_debug

# Build and upload to TestFlight (staging)
ENVFILE=.env.staging fastlane ios_beta

# Build release IPA for production (no upload)
ENVFILE=.env.production fastlane build_release

# Setup code signing
ENVFILE=.env.production fastlane setup_signing type:appstore
iOS Requirements
macOS with Xcode
CocoaPods installed
Apple Developer Account
App Store Connect API Key (for uploads)
iOS Build Scripts
# Build iOS debug
./scripts/build-ios.sh development debug

# Build iOS beta
./scripts/build-ios.sh staging beta

# Setup iOS environment
./scripts/setup-ios.sh