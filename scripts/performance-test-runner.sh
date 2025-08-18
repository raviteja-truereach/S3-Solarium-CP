#!/bin/bash

# Performance Test Runner Script
# Executes performance tests across different device tiers and platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEVICE_TIER=${1:-"minimum"}
PLATFORM=${2:-"android"}
TEST_TYPE=${3:-"all"}

echo -e "${BLUE}🚀 Performance Test Runner${NC}"
echo -e "${BLUE}============================${NC}"
echo "Device Tier: $DEVICE_TIER"
echo "Platform: $PLATFORM"
echo "Test Type: $TEST_TYPE"
echo ""

# Create reports directory
mkdir -p reports/performance

# Function to run cold start tests
run_cold_start_tests() {
    echo -e "${YELLOW}❄️  Running Cold Start Tests...${NC}"
    
    if [ "$PLATFORM" == "android" ]; then
        detox test e2e/performance/coldStart.perf.e2e.js \
            --configuration android.emu.debug \
            --device-tier $DEVICE_TIER \
            --artifacts-location reports/performance/cold-start-android
    else
        detox test e2e/performance/coldStart.perf.e2e.js \
            --configuration ios.sim.debug \
            --device-tier $DEVICE_TIER \
            --artifacts-location reports/performance/cold-start-ios
    fi
}

# Function to run navigation tests
run_navigation_tests() {
    echo -e "${YELLOW}🧭 Running Navigation Tests...${NC}"
    
    if [ "$PLATFORM" == "android" ]; then
        detox test e2e/performance/navigation.perf.e2e.js \
            --configuration android.emu.debug \
            --device-tier $DEVICE_TIER \
            --artifacts-location reports/performance/navigation-android
    else
        detox test e2e/performance/navigation.perf.e2e.js \
            --configuration ios.sim.debug \
            --device-tier $DEVICE_TIER \
            --artifacts-location reports/performance/navigation-ios
    fi
}

# Function to run memory tests
run_memory_tests() {
    echo -e "${YELLOW}🧠 Running Memory Tests...${NC}"
    
    yarn test __tests__/performance/memoryLeaks.test.ts \
        --testNamePattern="$DEVICE_TIER device tier" \
        --outputFile=reports/performance/memory-test-results.json
}

# Function to validate performance budgets
validate_budgets() {
    echo -e "${YELLOW}📊 Validating Performance Budgets...${NC}"
    
    # Collect metrics from test results
    node scripts/collect-performance-metrics.js \
        --device=$DEVICE_TIER \
        --platform=$PLATFORM \
        --output=reports/performance/metrics.json
    
    # Validate against budgets
    node scripts/validate-performance-budget.js \
        --metrics=reports/performance/metrics.json \
        --device=$DEVICE_TIER \
        --platform=$PLATFORM
}

# Function to measure instrumentation overhead
measure_overhead() {
    echo -e "${YELLOW}📈 Measuring Instrumentation Overhead...${NC}"
    
    # Run baseline tests (monitoring disabled)
    ENABLE_TELEMETRY=false yarn test __tests__/performance/baseline.test.ts \
        --outputFile=reports/performance/baseline-metrics.json
    
    # Run instrumented tests (monitoring enabled)
    ENABLE_TELEMETRY=true yarn test __tests__/performance/instrumented.test.ts \
        --outputFile=reports/performance/instrumented-metrics.json
    
    # Calculate overhead
    node scripts/calculate-overhead.js \
        --baseline=reports/performance/baseline-metrics.json \
        --instrumented=reports/performance/instrumented-metrics.json \
        --output=reports/performance/overhead-report.json
}

# Main execution based on test type
case $TEST_TYPE in
    "cold-start")
        run_cold_start_tests
        ;;
    "navigation")
        run_navigation_tests
        ;;
    "memory")
        run_memory_tests
        ;;
    "budget")
        validate_budgets
        ;;
    "overhead")
        measure_overhead
        ;;
    "all")
        run_cold_start_tests
        echo ""
        run_navigation_tests
        echo ""
        run_memory_tests
        echo ""
        validate_budgets
        echo ""
        measure_overhead
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $TEST_TYPE${NC}"
        echo "Available types: cold-start, navigation, memory, budget, overhead, all"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Performance testing completed!${NC}"
echo -e "${GREEN}📄 Reports available in: reports/performance/${NC}"