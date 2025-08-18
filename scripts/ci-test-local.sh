#!/bin/bash

# Local CI Test Script
# Simulates the CI pipeline locally for debugging

set -e

echo "🚀 Local CI Pipeline Test"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_step() {
    echo -e "\n${YELLOW}📋 $1${NC}"
}

# Step 1: Environment validation
print_step "Validating environment configuration"
test -f package.json && test -f jest.config.js && test -f jest.setup.ts
print_status $? "Environment configuration valid"

# Step 2: Install dependencies
print_step "Installing dependencies"
yarn install --frozen-lockfile --prefer-offline > /dev/null 2>&1
print_status $? "Dependencies installed"

# Step 3: Lint code
print_step "Running ESLint"
yarn lint > /dev/null 2>&1
print_status $? "Code linting passed"

# Step 4: Type check
print_step "Running TypeScript type check"
npx tsc --noEmit > /dev/null 2>&1
print_status $? "Type checking passed"

# Step 5: Run tests with coverage
print_step "Running tests with coverage"
yarn test:ci > /dev/null 2>&1
print_status $? "Tests with coverage completed"

# Step 6: Verify coverage thresholds
print_step "Verifying coverage thresholds"
if [ -f coverage/coverage-summary.json ]; then
    node -e "
        const coverage = require('./coverage/coverage-summary.json');
        const { total } = coverage;
        const metrics = ['lines', 'statements', 'functions', 'branches'];
        let failed = false;
        
        console.log('Coverage Summary:');
        console.log('================');
        metrics.forEach(metric => {
            const pct = total[metric].pct;
            const threshold = 80;
            const status = pct >= threshold ? '✅' : '❌';
            console.log(\`\${status} \${metric}: \${pct}% (threshold: \${threshold}%)\`);
            if (pct < threshold) failed = true;
        });
        
        if (failed) {
            console.log('❌ Coverage thresholds not met');
            process.exit(1);
        } else {
            console.log('✅ All coverage thresholds met');
        }
    "
    print_status $? "Coverage thresholds verification"
else
    echo -e "${RED}❌ Coverage summary not found${NC}"
    exit 1
fi

# Step 7: Generate badges
print_step "Generating coverage badges"
yarn coverage:badge > /dev/null 2>&1
print_status $? "Coverage badges generated"

echo -e "\n${GREEN}🎉 Local CI pipeline completed successfully!${NC}"
echo -e "${YELLOW}📁 Check the following outputs:${NC}"
echo "   📄 Coverage report: coverage/lcov-report/index.html"
echo "   🏆 Coverage badges: coverage/badges/"
echo "   📊 Coverage summary: coverage/coverage-summary.json"