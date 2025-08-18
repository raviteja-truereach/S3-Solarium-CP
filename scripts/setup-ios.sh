#!/bin/bash

# iOS Setup Script
# Installs CocoaPods dependencies and prepares iOS build environment

set -e

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS setup requires macOS"
    exit 1
fi

echo "🍎 Setting up iOS build environment..."

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Navigate to iOS directory and install pods
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install --clean-install
cd ..

# Check if Xcode is available
if ! command -v xcodebuild &> /dev/null; then
    echo "⚠️  Warning: Xcode command line tools not found"
    echo "   Install with: xcode-select --install"
else
    echo "✅ Xcode command line tools found"
fi

echo ""
echo "✅ iOS setup completed!"
echo "🚀 You can now run:"
echo "   yarn ios"
echo "   ./scripts/build-ios.sh development debug"