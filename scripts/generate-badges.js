const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('Coverage summary not found. Run tests first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;

// Generate badge data
const badges = {
  lines: {
    label: 'Coverage-Lines',
    message: `${total.lines.pct}%`,
    color: getBadgeColor(total.lines.pct),
  },
  functions: {
    label: 'Coverage-Functions', 
    message: `${total.functions.pct}%`,
    color: getBadgeColor(total.functions.pct),
  },
  branches: {
    label: 'Coverage-Branches',
    message: `${total.branches.pct}%`, 
    color: getBadgeColor(total.branches.pct),
  },
  statements: {
    label: 'Coverage-Statements',
    message: `${total.statements.pct}%`,
    color: getBadgeColor(total.statements.pct),
  },
};

function getBadgeColor(percentage) {
  if (percentage >= 90) return 'brightgreen';
  if (percentage >= 80) return 'green';
  if (percentage >= 70) return 'yellowgreen';
  if (percentage >= 60) return 'yellow';
  if (percentage >= 50) return 'orange';
  return 'red';
}

// Write badge data
const badgesDir = path.join(__dirname, '../badges');
if (!fs.existsSync(badgesDir)) {
  fs.mkdirSync(badgesDir);
}

Object.entries(badges).forEach(([key, badge]) => {
  const badgePath = path.join(badgesDir, `${key}.json`);
  fs.writeFileSync(badgePath, JSON.stringify(badge, null, 2));
});

console.log('Coverage badges generated successfully!');
console.log(`Lines: ${total.lines.pct}%`);
console.log(`Functions: ${total.functions.pct}%`);
console.log(`Branches: ${total.branches.pct}%`);
console.log(`Statements: ${total.statements.pct}%`);