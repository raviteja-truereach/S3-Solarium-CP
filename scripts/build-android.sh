#!/bin/bash

# Android Build Script
# Wrapper for Fastlane Android builds

set -e

# Default values
ENVIRONMENT=${1:-development}
BUILD_TYPE=${2:-debug}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Usage: $0 [development|staging|production] [debug|internal]"
    exit 1
fi

# Validate build type
if [[ ! "$BUILD_TYPE" =~ ^(debug|internal)$ ]]; then
    echo "❌ Error: Invalid build type '$BUILD_TYPE'"
    echo "Usage: $0 [development|staging|production] [debug|internal]"
    exit 1
fi

# Set environment file
ENVFILE=".env.$ENVIRONMENT"

if [[ ! -f "$ENVFILE" ]]; then
    echo "❌ Error: Environment file '$ENVFILE' not found"
    exit 1
fi

echo "🤖 Building Android app..."
echo "   Environment: $ENVIRONMENT"
echo "   Build Type: $BUILD_TYPE"
echo "   Config File: $ENVFILE"
echo ""

# Export environment file for Fastlane
export ENVFILE="$ENVFILE"

# Run appropriate Fastlane lane
if [[ "$BUILD_TYPE" == "debug" ]]; then
    fastlane android_debug
else
    fastlane android_internal
fi

echo ""
echo "✅ Android build completed!"
echo "📱 Check fastlane/builds/ for output files"