#!/bin/bash

# Build Size Measurement Script for Performance Optimization
# Measures and compares Android APK and iOS IPA sizes

set -e

echo "🔍 Build Size Measurement Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create reports directory
mkdir -p reports

# Function to format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(( bytes / 1073741824 ))GB"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(( bytes / 1048576 ))MB"
    elif [ $bytes -ge 1024 ]; then
        echo "$(( bytes / 1024 ))KB"
    else
        echo "${bytes}B"
    fi
}

# Function to measure Android APK size
measure_android() {
    echo -e "${YELLOW}📱 Measuring Android APK sizes...${NC}"
    
    cd android
    
    # Clean build
    ./gradlew clean
    
    # Build debug APK
    echo "Building debug APK..."
    ./gradlew assembleDebug
    
    # Build release APK
    echo "Building release APK..."
    ./gradlew assembleRelease
    
    cd ..
    
    # Find APK files
    DEBUG_APK=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)
    RELEASE_APK=$(find android/app/build/outputs/apk/release -name "*.apk" | head -1)
    
    if [ -f "$DEBUG_APK" ]; then
        DEBUG_SIZE=$(stat -c%s "$DEBUG_APK" 2>/dev/null || stat -f%z "$DEBUG_APK")
        DEBUG_FORMATTED=$(format_bytes $DEBUG_SIZE)
        echo -e "Debug APK:   ${DEBUG_FORMATTED} (${DEBUG_SIZE} bytes)"
    else
        echo -e "${RED}Debug APK not found${NC}"
        DEBUG_SIZE=0
    fi
    
    if [ -f "$RELEASE_APK" ]; then
        RELEASE_SIZE=$(stat -c%s "$RELEASE_APK" 2>/dev/null || stat -f%z "$RELEASE_APK")
        RELEASE_FORMATTED=$(format_bytes $RELEASE_SIZE)
        echo -e "Release APK: ${RELEASE_FORMATTED} (${RELEASE_SIZE} bytes)"
        
        if [ $DEBUG_SIZE -gt 0 ]; then
            REDUCTION=$(( (DEBUG_SIZE - RELEASE_SIZE) * 100 / DEBUG_SIZE ))
            echo -e "${GREEN}Size reduction: ${REDUCTION}%${NC}"
        fi
    else
        echo -e "${RED}Release APK not found${NC}"
    fi
    
    # Generate Android report
    cat > reports/android-build-sizes.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "android",
  "debug": {
    "size_bytes": ${DEBUG_SIZE},
    "size_formatted": "${DEBUG_FORMATTED}",
    "path": "${DEBUG_APK}"
  },
  "release": {
    "size_bytes": ${RELEASE_SIZE},
    "size_formatted": "${RELEASE_FORMATTED}",
    "path": "${RELEASE_APK}"
  },
  "reduction_percentage": $((DEBUG_SIZE > 0 ? (DEBUG_SIZE - RELEASE_SIZE) * 100 / DEBUG_SIZE : 0))
}
EOF
}

# Function to measure iOS IPA size (if on macOS)
measure_ios() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}🍎 Measuring iOS build sizes...${NC}"
        
        cd ios
        
        # Install pods if needed
        if [ ! -d "Pods" ]; then
            echo "Installing CocoaPods dependencies..."
            pod install
        fi
        
        # Check if Xcode command line tools are available
        if command -v xcodebuild >/dev/null 2>&1; then
            echo "Building iOS archive..."
            
            # Clean build
            xcodebuild clean -workspace cpapp.xcworkspace -scheme cpapp
            
            # Build release archive
            xcodebuild archive \
                -workspace cpapp.xcworkspace \
                -scheme cpapp \
                -configuration Release \
                -archivePath ./build/cpapp.xcarchive \
                -allowProvisioningUpdates \
                CODE_SIGN_IDENTITY="" \
                CODE_SIGNING_REQUIRED=NO \
                CODE_SIGNING_ALLOWED=NO
            
            # Find and measure archive
            if [ -d "./build/cpapp.xcarchive" ]; then
                ARCHIVE_SIZE=$(du -sb ./build/cpapp.xcarchive 2>/dev/null | cut -f1 || du -sk ./build/cpapp.xcarchive | awk '{print $1*1024}')
                ARCHIVE_FORMATTED=$(format_bytes $ARCHIVE_SIZE)
                echo -e "iOS Archive: ${ARCHIVE_FORMATTED} (${ARCHIVE_SIZE} bytes)"
                
                # Generate iOS report
                cat > ../reports/ios-build-sizes.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "ios",
  "archive": {
    "size_bytes": ${ARCHIVE_SIZE},
    "size_formatted": "${ARCHIVE_FORMATTED}",
    "path": "./build/cpapp.xcarchive"
  }
}
EOF
            else
                echo -e "${RED}iOS archive not found${NC}"
            fi
        else
            echo -e "${YELLOW}Xcode command line tools not available, skipping iOS build${NC}"
        fi
        
        cd ..
    else
        echo -e "${YELLOW}Not on macOS, skipping iOS build measurement${NC}"
    fi
}

# Main execution
echo "Starting build size measurement..."
echo "Timestamp: $(date)"

# Measure Android builds
measure_android

echo ""

# Measure iOS builds (if on macOS)
measure_ios

echo ""
echo -e "${GREEN}✅ Build size measurement complete!${NC}"
echo "Reports saved to reports/ directory"

# Generate combined report
if [ -f "reports/android-build-sizes.json" ] || [ -f "reports/ios-build-sizes.json" ]; then
    echo ""
    echo "📊 Summary Report:"
    echo "=================="
    
    if [ -f "reports/android-build-sizes.json" ]; then
        echo "Android build sizes saved to reports/android-build-sizes.json"
        cat reports/android-build-sizes.json | grep -E "size_formatted|reduction_percentage" | head -3
    fi
    
    if [ -f "reports/ios-build-sizes.json" ]; then
        echo "iOS build sizes saved to reports/ios-build-sizes.json"
    fi
fi