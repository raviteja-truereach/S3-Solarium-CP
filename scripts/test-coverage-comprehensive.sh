#!/bin/bash
# Comprehensive Test Coverage Script
# Runs all tests with detailed coverage reporting

set -e

echo "🧪 Running Comprehensive Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean previous coverage
echo "🧹 Cleaning previous coverage data..."
rm -rf coverage/
rm -f coverage.json

# Run tests with coverage
echo "📊 Running tests with coverage..."
yarn test --coverage --watchAll=false --verbose --testTimeout=10000

# Check coverage thresholds
echo "📈 Checking coverage thresholds..."

# Extract coverage percentages
LINES_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
BRANCHES_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.branches.pct')
FUNCTIONS_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.functions.pct')
STATEMENTS_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')

echo "Coverage Report:"
echo "- Lines: ${LINES_COVERAGE}%"
echo "- Branches: ${BRANCHES_COVERAGE}%"
echo "- Functions: ${FUNCTIONS_COVERAGE}%"
echo "- Statements: ${STATEMENTS_COVERAGE}%"

# Check minimum thresholds
MIN_COVERAGE=80
MIN_BUSINESS_LOGIC=85

if (( $(echo "$LINES_COVERAGE >= $MIN_COVERAGE" | bc -l) )); then
    echo -e "${GREEN}✅ Line coverage meets minimum threshold (${MIN_COVERAGE}%)${NC}"
else
    echo -e "${RED}❌ Line coverage below minimum threshold (${MIN_COVERAGE}%)${NC}"
    exit 1
fi

# Generate coverage badge
echo "🏷️ Generating coverage badge..."
if command -v yarn >/dev/null 2>&1; then
    yarn run coverage:badge
else
    npm run coverage:badge
fi

echo -e "${GREEN}✅ All tests passed with adequate coverage!${NC}"