# iOS Fastlane Configuration

iOS-specific Fastlane automation for Solarium CP App.

## Prerequisites

- macOS with Xcode installed
- CocoaPods installed (`gem install cocoapods`)
- Apple Developer Account
- App Store Connect API Key (for TestFlight uploads)

## Setup

### Initial Setup

```bash
# Install CocoaPods dependencies
yarn setup:ios

# Or manually
cd ios && pod install && cd ..

Code Signing Setup
For release builds, you'll need either:

Automatic Signing (simpler, for small teams)
Match (recommended for teams, stores certificates in Git)
Option 1: Automatic Signing
Set these in your environment:

IOS_TEAM_ID=YOUR_TEAM_ID
Option 2: Match Setup
# Initialize Match (one-time setup)
fastlane match init

# Generate certificates
ENVFILE=.env.production fastlane setup_signing type:development
ENVFILE=.env.production fastlane setup_signing type:appstore
Usage
Available Lanes
ios_debug - Build debug app (simulator/device)
ios_beta - Build release and upload to TestFlight
upload_testflight - Upload existing IPA to TestFlight
build_release - Build signed release IPA (no upload)
setup_signing - Setup code signing with Match
pods - Install CocoaPods dependencies
Environment Selection
# Development debug build
ENVFILE=.env.development fastlane ios_debug

# Staging TestFlight build
ENVFILE=.env.staging fastlane ios_beta

# Production TestFlight build
ENVFILE=.env.production fastlane ios_beta
Using Build Scripts
# Build debug for development
./scripts/build-ios.sh development debug

# Build beta for staging
./scripts/build-ios.sh staging beta

# Build beta for production
./scripts/build-ios.sh production beta
Configuration
App Store Connect API Key
Generate API key in App Store Connect
Download the .p8 file
Set environment variables:
APP_STORE_CONNECT_API_KEY_ID=your_key_id
APP_STORE_CONNECT_ISSUER_ID=your_issuer_id
APP_STORE_CONNECT_API_KEY_PATH=path/to/AuthKey_KEYID.p8
TestFlight Configuration
TESTFLIGHT_GROUPS=Internal Testing,Beta Testers
TESTFLIGHT_SKIP_WAITING_FOR_BUILD_PROCESSING=true
Troubleshooting
Code Signing Issues
If you get code signing errors:

Check Team ID: Ensure IOS_TEAM_ID is correct
Check Certificates: Run fastlane setup_signing
Fallback: Debug builds will fallback to simulator builds
CocoaPods Issues
# Clean and reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install --clean-install
cd ..
Xcode Issues
# Clean Xcode build cache
rm -rf ~/Library/Developer/Xcode/DerivedData
Build Outputs
Debug builds: Simulator app or signed IPA
Release builds: Signed IPA in fastlane/builds/
TestFlight: Automatic upload after successful build