/**
 * Coverage Report Generator
 * Generates detailed coverage reports and checks thresholds
 */

const fs = require('fs');
const path = require('path');

function generateCoverageReport() {
  const coveragePath = path.join(
    __dirname,
    '../coverage/coverage-summary.json'
  );

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage file not found. Run tests first.');
    process.exit(1);
  }

  const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const overall = coverageData.total;

  console.log('\n📊 Coverage Report');
  console.log('==================');
  console.log(
    `Lines:      ${overall.lines.pct}% (${overall.lines.covered}/${overall.lines.total})`
  );
  console.log(
    `Statements: ${overall.statements.pct}% (${overall.statements.covered}/${overall.statements.total})`
  );
  console.log(
    `Functions:  ${overall.functions.pct}% (${overall.functions.covered}/${overall.functions.total})`
  );
  console.log(
    `Branches:   ${overall.branches.pct}% (${overall.branches.covered}/${overall.branches.total})`
  );

  // Check thresholds
  const thresholds = {
    lines: 80,
    statements: 80,
    functions: 80,
    branches: 80,
  };

  let failed = false;
  console.log('\n🎯 Threshold Check');
  console.log('==================');

  Object.keys(thresholds).forEach((key) => {
    const actual = overall[key].pct;
    const threshold = thresholds[key];
    const status = actual >= threshold ? '✅' : '❌';

    if (actual < threshold) failed = true;

    console.log(`${status} ${key}: ${actual}% (threshold: ${threshold}%)`);
  });

  // Business logic coverage
  console.log('\n🏢 Business Logic Coverage');
  console.log('==========================');

  const modules = {
    Home: 'src/screens/home/',
    Leads: 'src/screens/leads/',
    Dashboard: 'src/components/dashboard/',
    Sync: 'src/sync/',
  };

  Object.keys(modules).forEach((name) => {
    const coverage = getModuleCoverage(coverageData, modules[name]);
    const status = coverage >= 85 ? '✅' : '❌';
    console.log(`${status} ${name}: ${coverage}%`);

    if (coverage < 85 && coverage > 0) failed = true;
  });

  if (failed) {
    console.log('\n❌ Coverage thresholds not met');
    process.exit(1);
  } else {
    console.log('\n✅ All coverage thresholds met');
  }
}

function getModuleCoverage(coverageData, modulePath) {
  const moduleFiles = Object.keys(coverageData)
    .filter((file) => file.includes(modulePath))
    .filter((file) => file !== 'total');

  if (moduleFiles.length === 0) return 0;

  let totalLines = 0;
  let coveredLines = 0;

  moduleFiles.forEach((file) => {
    const fileData = coverageData[file];
    totalLines += fileData.lines.total;
    coveredLines += fileData.lines.covered;
  });

  return totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
}

if (require.main === module) {
  generateCoverageReport();
}

module.exports = { generateCoverageReport };
