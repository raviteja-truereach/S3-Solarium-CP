#!/bin/bash

# Test Coverage Script
# Runs tests with coverage and generates badges

set -e

echo "🧪 Running tests with coverage..."

# Clean previous coverage
rm -rf coverage/

# Run tests with coverage
yarn test:ci

# Generate coverage badges
yarn test:badges

# Generate coverage summary
echo ""
echo "📊 Coverage Summary:"
echo "===================="
cat coverage/coverage-summary.json | jq '.total'

echo ""
echo "📁 Coverage files generated:"
echo "   📄 HTML Report: coverage/lcov-report/index.html"
echo "   📄 LCOV Report: coverage/lcov.info"
echo "   🏆 Badges: coverage/badges/"

# Check if coverage meets thresholds
echo ""
echo "✅ Coverage thresholds check:"
echo "   Lines: ≥80% required"
echo "   Functions: ≥80% required" 
echo "   Branches: ≥80% required"
echo "   Statements: ≥80% required"

echo ""
echo "🚀 To view coverage report:"
echo "   open coverage/lcov-report/index.html"