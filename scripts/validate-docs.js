/**
 * Documentation Validation Script
 * Validates documentation quality and consistency
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = path.join(__dirname, '../docs');
const README_PATH = path.join(__dirname, '../README.md');
const CHANGELOG_PATH = path.join(__dirname, '../CHANGELOG.md');

/**
 * Validate that all required documentation files exist
 */
function validateRequiredFiles() {
  console.log('📄 Validating required documentation files...');

  const requiredFiles = [
    'docs/adr/ADR-0012-add-lead-flow.md',
    'docs/L3-LLD-CPAPP.md',
    'docs/api-endpoint-reference-sheet.md',
    'CHANGELOG.md',
    'README.md',
  ];

  const missingFiles = [];

  requiredFiles.forEach((file) => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach((file) => console.error(`   - ${file}`));
    process.exit(1);
  }

  console.log('✅ All required documentation files exist');
}

/**
 * Validate markdown syntax using markdownlint
 */
function validateMarkdownSyntax() {
  console.log('📝 Validating markdown syntax...');

  try {
    execSync('npx markdownlint docs/**/*.md *.md', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Markdown syntax validation passed');
  } catch (error) {
    console.error('❌ Markdown syntax validation failed');
    process.exit(1);
  }
}

/**
 * Validate internal links in documentation
 */
function validateInternalLinks() {
  console.log('🔗 Validating internal links...');

  // This is a basic implementation - could be enhanced with more sophisticated link checking
  const markdownFiles = getMarkdownFiles(DOCS_DIR);
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const errors = [];

  markdownFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const linkUrl = match[2];

      // Check internal links (relative paths)
      if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
        const linkPath = path.resolve(path.dirname(file), linkUrl);
        if (!fs.existsSync(linkPath)) {
          errors.push(`${file}: Broken link to ${linkUrl}`);
        }
      }
    }
  });

  if (errors.length > 0) {
    console.error('❌ Broken internal links found:');
    errors.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }

  console.log('✅ Internal links validation passed');
}

/**
 * Validate ADR format and structure
 */
function validateADRFormat() {
  console.log('📋 Validating ADR format...');

  const adrPath = path.join(DOCS_DIR, 'adr/ADR-0012-add-lead-flow.md');
  const content = fs.readFileSync(adrPath, 'utf8');

  const requiredSections = [
    '# ADR-0012',
    '## Status',
    '## Date',
    '## Context',
    '## Decision',
    '## Consequences',
  ];

  const missingSections = requiredSections.filter(
    (section) => !content.includes(section)
  );

  if (missingSections.length > 0) {
    console.error('❌ ADR missing required sections:');
    missingSections.forEach((section) => console.error(`   - ${section}`));
    process.exit(1);
  }

  console.log('✅ ADR format validation passed');
}

/**
 * Validate changelog format
 */
function validateChangelogFormat() {
  console.log('📅 Validating changelog format...');

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  // Check for required changelog elements
  const requiredElements = [
    '# Changelog',
    '## [2.1.0]',
    '### Added',
    'Keep a Changelog',
  ];

  const missingElements = requiredElements.filter(
    (element) => !content.includes(element)
  );

  if (missingElements.length > 0) {
    console.error('❌ Changelog missing required elements:');
    missingElements.forEach((element) => console.error(`   - ${element}`));
    process.exit(1);
  }

  console.log('✅ Changelog format validation passed');
}

/**
 * Get all markdown files recursively
 */
function getMarkdownFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    items.forEach((item) => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (path.extname(item) === '.md') {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Starting documentation validation...\n');

  try {
    validateRequiredFiles();
    validateMarkdownSyntax();
    validateInternalLinks();
    validateADRFormat();
    validateChangelogFormat();

    console.log('\n🎉 All documentation validation checks passed!');
  } catch (error) {
    console.error('\n💥 Documentation validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateRequiredFiles,
  validateMarkdownSyntax,
  validateInternalLinks,
  validateADRFormat,
  validateChangelogFormat,
};
