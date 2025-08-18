#!/bin/bash

# iOS Build Script
# Wrapper for Fastlane iOS builds

set -e

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS builds require macOS"
    exit 1
fi

# Default values
ENVIRONMENT=${1:-development}
BUILD_TYPE=${2:-debug}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Usage: $0 [development|staging|production] [debug|beta]"
    exit 1
fi

# Validate build type
if [[ ! "$BUILD_TYPE" =~ ^(debug|beta)$ ]]; then
    echo "❌ Error: Invalid build type '$BUILD_TYPE'"
    echo "Usage: $0 [development|staging|production] [debug|beta]"
    exit 1
fi

# Set environment file
ENVFILE=".env.$ENVIRONMENT"

if [[ ! -f "$ENVFILE" ]]; then
    echo "❌ Error: Environment file '$ENVFILE' not found"
    exit 1
fi

echo "🍎 Building iOS app..."
echo "   Environment: $ENVIRONMENT"
echo "   Build Type: $BUILD_TYPE"
echo "   Config File: $ENVFILE"
echo ""

# Export environment file for Fastlane
export ENVFILE="$ENVFILE"

# Run appropriate Fastlane lane
if [[ "$BUILD_TYPE" == "debug" ]]; then
    fastlane ios_debug
else
    fastlane ios_beta
fi

echo ""
echo "✅ iOS build completed!"
echo "📱 Check fastlane/builds/ for output files"