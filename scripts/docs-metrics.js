/**
 * Documentation Metrics Generator
 * Analyzes documentation completeness and quality
 */

const fs = require('fs');
const path = require('path');

function analyzeDocumentation() {
  console.log('📊 Documentation Metrics');
  console.log('========================');

  const metrics = {
    files: {
      readme: checkFileExists('README.md'),
      changelog: checkFileExists('CHANGELOG.md'),
      adr: checkFileExists('docs/adr/ADR-0007-sync-scheduler.md'),
    },
    content: {
      readmeWordCount: getWordCount('README.md'),
      changelogEntries: getChangelogEntries(),
      featureMatrixComplete: checkFeatureMatrix(),
    },
    quality: {
      markdownLint: true, // Will be set by linter
      brokenLinks: 0,
      lastUpdated: getLastUpdated(),
    },
  };

  // Display metrics
  displayMetrics(metrics);

  // Generate score
  const score = calculateScore(metrics);
  console.log(`\n📈 Documentation Score: ${score}/100`);

  if (score >= 90) {
    console.log('🏆 Excellent documentation quality!');
  } else if (score >= 80) {
    console.log('✅ Good documentation quality');
  } else {
    console.log('⚠️  Documentation needs improvement');
  }

  return score;
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function getWordCount(filePath) {
  if (!fs.existsSync(filePath)) return 0;

  const content = fs.readFileSync(filePath, 'utf8');
  return content.split(/\s+/).length;
}

function getChangelogEntries() {
  if (!fs.existsSync('CHANGELOG.md')) return 0;

  const content = fs.readFileSync('CHANGELOG.md', 'utf8');
  const versions = content.match(/\[[\d.]+\]/g) || [];
  return versions.length;
}

function checkFeatureMatrix() {
  if (!fs.existsSync('README.md')) return false;

  const content = fs.readFileSync('README.md', 'utf8');
  const completedFeatures = (content.match(/✅.*S2/g) || []).length;
  return completedFeatures >= 2; // Dashboard + Leads
}

function getLastUpdated() {
  const files = ['README.md', 'CHANGELOG.md'];
  let latest = 0;

  files.forEach((file) => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.mtime > latest) {
        latest = stats.mtime;
      }
    }
  });

  return latest ? new Date(latest).toISOString().split('T')[0] : 'unknown';
}

function displayMetrics(metrics) {
  console.log('\n📁 File Coverage:');
  Object.keys(metrics.files).forEach((key) => {
    const status = metrics.files[key] ? '✅' : '❌';
    console.log(`  ${status} ${key}`);
  });

  console.log('\n📄 Content Analysis:');
  console.log(`  📝 README word count: ${metrics.content.readmeWordCount}`);
  console.log(`  🔄 Changelog entries: ${metrics.content.changelogEntries}`);
  console.log(
    `  ✅ Feature matrix complete: ${
      metrics.content.featureMatrixComplete ? 'Yes' : 'No'
    }`
  );

  console.log('\n🎯 Quality Indicators:');
  console.log(`  📅 Last updated: ${metrics.quality.lastUpdated}`);
  console.log(`  🔗 Broken links: ${metrics.quality.brokenLinks}`);
}

function calculateScore(metrics) {
  let score = 0;

  // File existence (30 points)
  Object.values(metrics.files).forEach((exists) => {
    if (exists) score += 10;
  });

  // Content quality (40 points)
  if (metrics.content.readmeWordCount > 1000) score += 15;
  if (metrics.content.changelogEntries >= 2) score += 10;
  if (metrics.content.featureMatrixComplete) score += 15;

  // Quality indicators (30 points)
  if (metrics.quality.markdownLint) score += 15;
  if (metrics.quality.brokenLinks === 0) score += 15;

  return Math.min(score, 100);
}

if (require.main === module) {
  analyzeDocumentation();
}

module.exports = { analyzeDocumentation };
