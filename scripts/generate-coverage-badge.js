/**
 * Coverage Badge Generation Script
 * Generates coverage badge based on Jest coverage results
 */
const fs = require('fs');
const path = require('path');

function generateCoverageBadge() {
  try {
    // Read coverage summary
    const coveragePath = path.join(
      __dirname,
      '../coverage/coverage-summary.json'
    );

    if (!fs.existsSync(coveragePath)) {
      console.error(
        '❌ Coverage summary not found. Run tests with coverage first.'
      );
      process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const totalCoverage = coverageData.total;

    // Calculate overall coverage percentage
    const linesCoverage = totalCoverage.lines.pct;
    const branchesCoverage = totalCoverage.branches.pct;
    const functionsCoverage = totalCoverage.functions.pct;
    const statementsCoverage = totalCoverage.statements.pct;

    const overallCoverage = Math.round(
      (linesCoverage +
        branchesCoverage +
        functionsCoverage +
        statementsCoverage) /
        4
    );

    // Determine badge color
    let color = 'red';
    if (overallCoverage >= 90) color = 'brightgreen';
    else if (overallCoverage >= 80) color = 'green';
    else if (overallCoverage >= 70) color = 'yellow';
    else if (overallCoverage >= 60) color = 'orange';

    // Generate badge URL
    const badgeUrl = `https://img.shields.io/badge/coverage-${overallCoverage}%25-${color}.svg`;

    // Update README with badge
    const readmePath = path.join(__dirname, '../README.md');
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf8');

      // Replace existing badge or add new one
      const badgeRegex =
        /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+\.svg\)/;
      const newBadge = `![Coverage](${badgeUrl})`;

      if (badgeRegex.test(readmeContent)) {
        readmeContent = readmeContent.replace(badgeRegex, newBadge);
      } else {
        // Add badge after title
        readmeContent = readmeContent.replace(
          /^(# .*\n)/m,
          `$1\n${newBadge}\n`
        );
      }

      fs.writeFileSync(readmePath, readmeContent);
      console.log('✅ Updated README with coverage badge');
    }

    // Output coverage summary
    console.log('\n📊 Coverage Summary:');
    console.log(`Lines: ${linesCoverage}%`);
    console.log(`Branches: ${branchesCoverage}%`);
    console.log(`Functions: ${functionsCoverage}%`);
    console.log(`Statements: ${statementsCoverage}%`);
    console.log(`Overall: ${overallCoverage}%`);
    console.log(`Badge Color: ${color}`);

    // Check if thresholds are met
    const thresholdsMet = {
      lines: linesCoverage >= 80,
      branches: branchesCoverage >= 80,
      functions: functionsCoverage >= 80,
      statements: statementsCoverage >= 80,
    };

    const allThresholdsMet = Object.values(thresholdsMet).every(Boolean);

    if (allThresholdsMet) {
      console.log('✅ All coverage thresholds met!');
    } else {
      console.log('❌ Some coverage thresholds not met:');
      Object.entries(thresholdsMet).forEach(([metric, met]) => {
        if (!met)
          console.log(
            `  - ${metric}: ${totalCoverage[metric].pct}% (need 80%)`
          );
      });
    }

    return overallCoverage;
  } catch (error) {
    console.error('❌ Error generating coverage badge:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateCoverageBadge();
}

module.exports = { generateCoverageBadge };
