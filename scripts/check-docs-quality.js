/**
 * Documentation Quality Check Script
 * Validates markdown files and generates quality metrics
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDocsQuality() {
  console.log('📚 Checking documentation quality...\n');

  let allPassed = true;
  const results = {
    markdownlint: false,
    linkCheck: false,
    adrCompliance: false,
    diagramValidation: false,
  };

  try {
    // 1. Run markdownlint
    console.log('🔍 Running markdownlint...');
    try {
      execSync('npx markdownlint **/*.md', { stdio: 'pipe' });
      console.log('✅ Markdownlint: All files pass');
      results.markdownlint = true;
    } catch (error) {
      console.log('❌ Markdownlint: Issues found');
      console.log(error.stdout.toString());
      allPassed = false;
    }

    // 2. Check ADR compliance
    console.log('\n🔍 Checking ADR compliance...');
    const adrPath = 'docs/adr/ADR-0009-lead-module-foundation.md';
    if (fs.existsSync(adrPath)) {
      const content = fs.readFileSync(adrPath, 'utf8');
      const requiredSections = [
        '## Status',
        '## Context',
        '## Decision',
        '## Consequences',
        '## Alternatives Considered',
      ];

      const missingSections = requiredSections.filter(
        (section) => !content.includes(section)
      );

      if (missingSections.length === 0) {
        console.log('✅ ADR compliance: All required sections present');
        results.adrCompliance = true;
      } else {
        console.log('❌ ADR compliance: Missing sections:', missingSections);
        allPassed = false;
      }
    } else {
      console.log('❌ ADR compliance: ADR-0009 file missing');
      allPassed = false;
    }

    // 3. Validate mermaid diagrams
    console.log('\n🔍 Validating mermaid diagrams...');
    const lldPath = 'docs/L3-LLD-CPAPP.md';
    if (fs.existsSync(lldPath)) {
      const content = fs.readFileSync(lldPath, 'utf8');
      const mermaidBlocks = content.match(/```mermaid[\s\S]*?```/g) || [];

      if (mermaidBlocks.length >= 3) {
        console.log(
          `✅ Diagram validation: Found ${mermaidBlocks.length} mermaid diagrams`
        );
        results.diagramValidation = true;
      } else {
        console.log(
          `❌ Diagram validation: Only ${mermaidBlocks.length} diagrams found (expected ≥3)`
        );
        allPassed = false;
      }
    } else {
      console.log('❌ Diagram validation: L3-LLD-CPAPP.md file missing');
      allPassed = false;
    }

    // 4. Check for broken internal links (basic)
    console.log('\n🔍 Checking internal links...');
    const docFiles = getAllMarkdownFiles('docs/');
    let brokenLinks = [];

    docFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const links = content.match(/\[.*?\]\(([^)]+)\)/g) || [];

      links.forEach((link) => {
        const href = link.match(/\[.*?\]\(([^)]+)\)/)[1];
        if (href.startsWith('./') || href.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(file), href);
          if (!fs.existsSync(resolvedPath)) {
            brokenLinks.push(`${file}: ${href}`);
          }
        }
      });
    });

    if (brokenLinks.length === 0) {
      console.log('✅ Link check: No broken internal links found');
      results.linkCheck = true;
    } else {
      console.log('❌ Link check: Broken links found:');
      brokenLinks.forEach((link) => console.log(`  - ${link}`));
      allPassed = false;
    }

    // 5. Generate quality metrics
    console.log('\n📊 Documentation Quality Metrics:');
    const metrics = generateQualityMetrics();
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });

    // 6. Summary
    console.log('\n📋 Summary:');
    Object.entries(results).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });

    if (allPassed) {
      console.log('\n🎉 All documentation quality checks passed!');
      return 0;
    } else {
      console.log('\n❌ Some documentation quality checks failed.');
      return 1;
    }
  } catch (error) {
    console.error('❌ Error during documentation quality check:', error);
    return 1;
  }
}

function getAllMarkdownFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    items.forEach((item) => {
      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory() && item.name !== 'node_modules') {
        traverse(fullPath);
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push(fullPath);
      }
    });
  }

  if (fs.existsSync(dir)) {
    traverse(dir);
  }

  return files;
}

function generateQualityMetrics() {
  const docFiles = getAllMarkdownFiles('docs/');

  let totalLines = 0;
  let totalWords = 0;
  let diagramCount = 0;
  let codeBlockCount = 0;

  docFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter((word) => word.length > 0);
    const diagrams = content.match(/```mermaid/g) || [];
    const codeBlocks = content.match(/```/g) || [];

    totalLines += lines.length;
    totalWords += words.length;
    diagramCount += diagrams.length;
    codeBlockCount += Math.floor(codeBlocks.length / 2); // Each code block has start and end
  });

  return {
    'Total documentation files': docFiles.length,
    'Total lines of documentation': totalLines,
    'Total words': totalWords,
    'Mermaid diagrams': diagramCount,
    'Code examples': codeBlockCount,
    'Average words per file': Math.round(totalWords / docFiles.length),
  };
}

if (require.main === module) {
  process.exit(checkDocsQuality());
}

module.exports = { checkDocsQuality };
