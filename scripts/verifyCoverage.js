/**
 * Coverage Verification Script
 * Ensures coverage requirements are met
 */
const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coverageFile)) {
  console.error('❌ Coverage file not found. Run tests with --coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const requirements = {
  overall: 80,
  businessLogic: 85,
};

const businessLogicPaths = [
  'src/hooks/useLeadById.ts',
  'src/components/leads/LeadInfoTab.tsx',
  'src/screens/leads/LeadDetailScreen.tsx',
];

// Check overall coverage
const overallCoverage = coverage.total;
const overallPass =
  overallCoverage.lines.pct >= requirements.overall &&
  overallCoverage.functions.pct >= requirements.overall &&
  overallCoverage.branches.pct >= requirements.overall &&
  overallCoverage.statements.pct >= requirements.overall;

console.log(`📊 Overall Coverage: ${overallCoverage.lines.pct}%`);
console.log(
  `✅ Overall Requirement: ${requirements.overall}% - ${
    overallPass ? 'PASS' : 'FAIL'
  }`
);

// Check business logic coverage
let businessLogicPass = true;
for (const path of businessLogicPaths) {
  if (coverage[path]) {
    const fileCoverage = coverage[path];
    const filePass = fileCoverage.lines.pct >= requirements.businessLogic;
    businessLogicPass = businessLogicPass && filePass;

    console.log(
      `📋 ${path}: ${fileCoverage.lines.pct}% - ${filePass ? 'PASS' : 'FAIL'}`
    );
  }
}

console.log(
  `✅ Business Logic Requirement: ${requirements.businessLogic}% - ${
    businessLogicPass ? 'PASS' : 'FAIL'
  }`
);

if (!overallPass || !businessLogicPass) {
  console.error('❌ Coverage requirements not met');
  process.exit(1);
}

console.log('✅ All coverage requirements met');
