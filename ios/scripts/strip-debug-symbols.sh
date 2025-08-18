#!/bin/bash

# Post-build script for iOS build optimization
# Strips debug symbols and optimizes the final build

set -e

echo "🔧 Starting iOS build optimization..."

# Get build configuration and paths
CONFIGURATION="${CONFIGURATION:-Release}"
BUILT_PRODUCTS_DIR="${BUILT_PRODUCTS_DIR}"
TARGET_NAME="${TARGET_NAME:-cpapp}"
DWARF_DSYM_FOLDER_PATH="${DWARF_DSYM_FOLDER_PATH}"

echo "📋 Build Configuration: $CONFIGURATION"
echo "📂 Built Products Dir: $BUILT_PRODUCTS_DIR"
echo "🎯 Target Name: $TARGET_NAME"

# Only run optimizations for Release builds
if [ "$CONFIGURATION" != "Release" ]; then
    echo "⏭️  Skipping optimization for $CONFIGURATION build"
    exit 0
fi

# Paths
APP_PATH="$BUILT_PRODUCTS_DIR/$TARGET_NAME.app"
DSYM_PATH="$DWARF_DSYM_FOLDER_PATH/$TARGET_NAME.app.dSYM"
BINARY_PATH="$APP_PATH/$TARGET_NAME"

echo "🔍 Checking paths:"
echo "   App: $APP_PATH"
echo "   dSYM: $DSYM_PATH"
echo "   Binary: $BINARY_PATH"

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo "❌ Binary not found at $BINARY_PATH"
    exit 1
fi

# Get binary size before optimization
BEFORE_SIZE=$(stat -f%z "$BINARY_PATH" 2>/dev/null || echo "0")
echo "📏 Binary size before optimization: $BEFORE_SIZE bytes"

# Strip debug symbols from the binary (they're preserved in dSYM)
if [ -f "$BINARY_PATH" ]; then
    echo "🔧 Stripping debug symbols from binary..."
    strip -x "$BINARY_PATH"
    
    # Get binary size after stripping
    AFTER_SIZE=$(stat -f%z "$BINARY_PATH" 2>/dev/null || echo "0")
    SAVED_SIZE=$((BEFORE_SIZE - AFTER_SIZE))
    
    echo "📏 Binary size after optimization: $AFTER_SIZE bytes"
    echo "💾 Space saved: $SAVED_SIZE bytes"
else
    echo "⚠️  Binary not found, skipping strip operation"
fi

# Verify dSYM was created
if [ -d "$DSYM_PATH" ]; then
    echo "✅ dSYM file created successfully: $DSYM_PATH"
    
    # Get dSYM size
    DSYM_SIZE=$(du -sk "$DSYM_PATH" | cut -f1)
    echo "📏 dSYM size: ${DSYM_SIZE}KB"
else
    echo "⚠️  dSYM not found at $DSYM_PATH"
fi

# Additional optimizations for App Store builds
if [ "$CONFIGURATION" = "Release" ]; then
    echo "🏪 Applying App Store optimizations..."
    
    # Remove any remaining debug files
    find "$APP_PATH" -name "*.dSYM" -exec rm -rf {} + 2>/dev/null || true
    find "$APP_PATH" -name "*.plist" -path "*/DebugHierarchy/*" -delete 2>/dev/null || true
    
    # Optimize PNG files (basic optimization)
    find "$APP_PATH" -name "*.png" -exec pngcrush -ow {} \; 2>/dev/null || true
    
    echo "✅ App Store optimizations applied"
fi

echo "🎉 iOS build optimization completed successfully!"
echo "📊 Summary:"
echo "   - Debug symbols stripped from binary"
echo "   - dSYM preserved for crash symbolication" 
echo "   - Binary size reduced by $SAVED_SIZE bytes"
echo "   - Ready for App Store submission"

exit 0