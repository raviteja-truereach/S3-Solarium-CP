#!/bin/bash

# Configure iOS build settings for optimization
# Run this script from the project root directory

set -e

echo "🔧 Configuring iOS build settings..."

PROJECT_DIR="ios/cpapp.xcodeproj"
PBXPROJ="$PROJECT_DIR/project.pbxproj"

# Check if project file exists
if [ ! -f "$PBXPROJ" ]; then
    echo "❌ Project file not found: $PBXPROJ"
    exit 1
fi

# Create backup
cp "$PBXPROJ" "$PBXPROJ.backup.$(date +%Y%m%d_%H%M%S)"
echo "💾 Created backup of project file"

# Function to add or update build setting
update_build_setting() {
    local setting_name="$1"
    local setting_value="$2"
    local config_name="$3"
    
    echo "🔧 Updating $setting_name = $setting_value for $config_name"
    
    # This is a basic approach - in practice, you might want to use xcodeproj gem
    # or PlistBuddy for more reliable editing
    sed -i.tmp "s/\($setting_name = \).*\(; \/\* $config_name \*\/\)/\1$setting_value\2/g" "$PBXPROJ"
}

# Apply Release build optimizations
echo "🎯 Applying Release build optimizations..."

# Note: These sed commands are basic examples
# For production use, consider using xcodeproj Ruby gem or xcconfig files

echo "⚠️  Manual Xcode configuration required!"
echo "Please open Xcode and apply the following build settings:"

cat << EOF

📋 RELEASE BUILD SETTINGS TO CONFIGURE IN XCODE:

Target: cpapp -> Build Settings -> Release Configuration

🔧 OPTIMIZATION:
   - Optimization Level (GCC_OPTIMIZATION_LEVEL): Optimize for Size [-Os]
   - Swift Optimization Level (SWIFT_OPTIMIZATION_LEVEL): Optimize for Size [-Osize]

🗂️  DEBUG INFORMATION:
   - Debug Information Format (DEBUG_INFORMATION_FORMAT): DWARF with dSYM File
   - Generate Debug Symbols (GCC_GENERATE_DEBUGGING_SYMBOLS): Yes
   - Strip Debug Symbols During Copy (COPY_PHASE_STRIP): Yes
   - Strip Linked Product (STRIP_INSTALLED_PRODUCT): Yes

🎯 CODE STRIPPING:
   - Dead Code Stripping (DEAD_CODE_STRIPPING): Yes
   - Strip Style (STRIP_STYLE): All Symbols

🏗️  BUILD OPTIONS:
   - Only Build Active Architecture (ONLY_ACTIVE_ARCH): No
   - Validate Built Product (VALIDATE_PRODUCT): Yes
   - Enable NS Assertions (ENABLE_NS_ASSERTIONS): No

🔐 DEPLOYMENT:
   - iOS Deployment Target (IPHONEOS_DEPLOYMENT_TARGET): 14.0
   - Strip Swift Symbols (STRIP_SWIFT_SYMBOLS): Yes

EOF

echo "✅ Configuration guide displayed"
echo "💡 Alternative: Use xcconfig files for automated configuration"

exit 0