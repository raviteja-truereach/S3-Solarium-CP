#!/usr/bin/env node

/**
 * Documentation Quality Checker
 * Validates documentation completeness and quality
 */

const fs = require('fs');
const path = require('path');

class DocsQualityChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.docsPath = path.join(__dirname, '../docs');
  }

  checkFile(filePath) {
    if (!fs.existsSync(filePath)) {
      this.errors.push(`Missing file: ${filePath}`);
      return false;
    }
    return true;
  }

  checkADR(adrPath) {
    if (!this.checkFile(adrPath)) return;

    const content = fs.readFileSync(adrPath, 'utf8');
    const requiredSections = ['Status', 'Context', 'Decision', 'Consequences'];

    requiredSections.forEach((section) => {
      if (!content.includes(`## ${section}`)) {
        this.errors.push(`${adrPath}: Missing required section: ${section}`);
      }
    });

    // Check for status
    if (
      !content.includes('**Accepted**') &&
      !content.includes('**Rejected**')
    ) {
      this.errors.push(`${adrPath}: Missing status declaration`);
    }
  }

  checkSequenceDiagrams(lldPath) {
    if (!this.checkFile(lldPath)) return;

    const content = fs.readFileSync(lldPath, 'utf8');
    const requiredDiagrams = [
      'Status Lifecycle Sequence Diagram',
      'Status Validation Flow',
      'Quotation Integration Flow',
      'Cache Consistency Architecture',
    ];

    requiredDiagrams.forEach((diagram) => {
      if (!content.includes(diagram)) {
        this.warnings.push(`${lldPath}: Missing diagram: ${diagram}`);
      }
    });

    // Check for mermaid syntax
    const mermaidBlocks = content.match(/```mermaid/g);
    if (!mermaidBlocks || mermaidBlocks.length < 4) {
      this.warnings.push(
        `${lldPath}: Insufficient mermaid diagrams (expected 4+)`
      );
    }
  }

  checkReadmeUpdates(readmePath) {
    if (!this.checkFile(readmePath)) return;

    const content = fs.readFileSync(readmePath, 'utf8');
    const requiredSections = [
      'Lead Status Management',
      'Performance Metrics',
      'Quotation Integration',
      'Accessibility Features',
    ];

    requiredSections.forEach((section) => {
      if (!content.includes(section)) {
        this.warnings.push(`${readmePath}: Missing section: ${section}`);
      }
    });
  }

  checkDocumentationChecklist(checklistPath) {
    if (!this.checkFile(checklistPath)) return;

    const content = fs.readFileSync(checklistPath, 'utf8');
    const requiredItems = [
      'ADR-0014-lead-status-update.md',
      'Lead Status Update Flow',
      'Lead Status Management section',
      'Unit test coverage',
      'Integration test coverage',
    ];

    requiredItems.forEach((item) => {
      if (!content.includes(item)) {
        this.errors.push(`${checklistPath}: Missing checklist item: ${item}`);
      }
    });
  }

  validateLinks(content, filePath) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkPath = match[2];

      // Skip external links
      if (linkPath.startsWith('http')) continue;

      // Check internal links
      const fullPath = path.resolve(path.dirname(filePath), linkPath);
      if (!fs.existsSync(fullPath)) {
        this.warnings.push(`${filePath}: Broken link: ${linkPath}`);
      }
    }
  }

  run() {
    console.log('🔍 Running documentation quality check...\n');

    // Check ADR-0014
    const adrPath = path.join(
      this.docsPath,
      'adr',
      'ADR-0014-lead-status-update.md'
    );
    this.checkADR(adrPath);

    // Check L3-LLD updates
    const lldPath = path.join(this.docsPath, 'L3-LLD-CPAPP.md');
    this.checkSequenceDiagrams(lldPath);

    // Check README updates
    const readmePath = path.join(__dirname, '../README.md');
    this.checkReadmeUpdates(readmePath);

    // Check documentation checklist
    const checklistPath = path.join(
      this.docsPath,
      'DOCUMENTATION_CHECKLIST.md'
    );
    this.checkDocumentationChecklist(checklistPath);

    // Validate links in all markdown files
    const markdownFiles = [adrPath, lldPath, readmePath, checklistPath];
    markdownFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        this.validateLinks(content, file);
      }
    });

    // Report results
    console.log('📊 Documentation Quality Report\n');

    if (this.errors.length === 0) {
      console.log('✅ All required documentation is present and valid');
    } else {
      console.log(`❌ Found ${this.errors.length} error(s):`);
      this.errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warning(s):`);
      this.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Run the checker
const checker = new DocsQualityChecker();
checker.run();
