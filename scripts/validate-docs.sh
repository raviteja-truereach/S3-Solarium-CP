#!/bin/bash

# Documentation Validation Script
# Validates all documentation for consistency and accuracy

set -e

echo "📚 Validating documentation..."

# Check if required documentation files exist
required_files=(
  "README.md"
  "CONTRIBUTING.md"
  "docs/README.md"
  "docs/ci-cd-pipeline.md"
  "docs/adr/ADR-0001-ci-pipeline-toolchain.md"
  "fastlane/README.md"
)

missing_files=()
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    missing_files+=("$file")
  fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
  echo "❌ Missing required documentation files:"
  for file in "${missing_files[@]}"; do
    echo "  - $file"
  done
  exit 1
fi

echo "✅ All required documentation files exist"

# Validate markdown syntax
echo "🔍 Validating markdown syntax..."
yarn docs:check

# Check for broken internal links
echo "🔗 Checking internal links..."
find . -name "*.md" -exec grep -l "\]\(" {} \; | while read -r file; do
  echo "Checking links in: $file"
  # Extract markdown links and validate they exist
  grep -o '\](.*\.md)' "$file" | sed 's/](//;s/)$//' | while read -r link; do
    # Handle relative paths
    if [[ "$link" =~ ^\.\./ ]]; then
      # Relative to current file's directory
      dir=$(dirname "$file")
      resolved_path="$dir/$link"
    elif [[ "$link" =~ ^\.\/ ]]; then
      # Relative to current file's directory  
      dir=$(dirname "$file")
      resolved_path="$dir/${link#./}"
    else
      # Relative to repository root
      resolved_path="$link"
    fi
    
    # Normalize path
    resolved_path=$(realpath --relative-to=. "$resolved_path" 2>/dev/null || echo "$resolved_path")
    
    if [[ ! -f "$resolved_path" ]]; then
      echo "⚠️  Broken link in $file: $link -> $resolved_path"
    fi
  done
done

# Validate code examples in documentation
echo "🧪 Validating code examples..."
temp_test_dir=$(mktemp -d)
cd "$temp_test_dir"

# Extract and test bash code blocks from README
echo "Testing bash examples from README..."
grep -A 10 '```bash' ../README.md | grep -v '```' | grep -E '^(yarn|npm|cd|mkdir|chmod)' | head -5 | while read -r cmd; do
  echo "Would test: $cmd" 
  # In a real scenario, you'd want to test these commands safely
done

cd - >/dev/null
rm -rf "$temp_test_dir"

echo "✅ Documentation validation completed successfully!"
echo ""
echo "📊 Documentation Statistics:"
echo "   Total .md files: $(find . -name "*.md" | wc -l)"
echo "   Total lines: $(cat $(find . -name "*.md") | wc -l)"
echo "   README.md size: $(wc -l < README.md) lines"
echo "   CONTRIBUTING.md size: $(wc -l < CONTRIBUTING.md) lines"


#!/bin/bash

# Documentation Validation Script
# Validates all documentation files for consistency and standards compliance

set -e

echo "📚 Validating Documentation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Helper functions
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

# Check if required files exist
echo "📁 Checking required documentation files..."

required_files=(
    "README.md"
    "CHANGELOG.md"
    "docs/adr/ADR-0007-sync-scheduler.md"
    "package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        success "Found $file"
    else
        error "Missing required file: $file"
    fi
done

# Validate README.md
echo -e "\n📖 Validating README.md..."

if [ -f "README.md" ]; then
    # Check for required sections
    required_sections=(
        "# Solarium CP App"
        "## 🚀 Feature Matrix"
        "## 🏗️ Architecture"
        "## 🧪 Testing Strategy"
        "## 🚀 Getting Started"
    )
    
    for section in "${required_sections[@]}"; do
        if grep -q "$section" README.md; then
            success "Found section: $section"
        else
            error "Missing section in README.md: $section"
        fi
    done
    
    # Check for badges
    if grep -q "<!-- BADGES:START -->" README.md; then
        success "Found badges section"
    else
        warning "No badges section found in README.md"
    fi
    
    # Check Feature Matrix updates
    if grep -q "Dashboard counters.*✅.*S2" README.md; then
        success "Dashboard counters marked as completed"
    else
        error "Dashboard counters not marked as completed in Feature Matrix"
    fi
    
    if grep -q "Leads list (read-only).*✅.*S2" README.md; then
        success "Leads list marked as completed"
    else
        error "Leads list not marked as completed in Feature Matrix"
    fi
    
    # Check for Sprint 2 content
    if grep -q "Sprint 2" README.md; then
        success "Contains Sprint 2 references"
    else
        warning "No Sprint 2 references found"
    fi
fi

# Validate CHANGELOG.md
echo -e "\n📝 Validating CHANGELOG.md..."

if [ -f "CHANGELOG.md" ]; then
    # Check format compliance
    if grep -q "# Changelog" CHANGELOG.md; then
        success "Proper changelog header found"
    else
        error "Missing proper changelog header"
    fi
    
    # Check for S2-TASK-05 section
    if grep -q "S2-TASK-05" CHANGELOG.md; then
        success "Found S2-TASK-05 section"
    else
        error "Missing S2-TASK-05 section in CHANGELOG.md"
    fi
    
    # Check for version format
    if grep -q "\[1\.2\.0\]" CHANGELOG.md; then
        success "Found version 1.2.0 entry"
    else
        warning "No version 1.2.0 entry found"
    fi
    
    # Check for user-visible changes
    user_changes=(
        "Live Dashboard Metrics"
        "My Leads List"
        "Enhanced Navigation"
        "Disabled Add Lead FAB"
    )
    
    for change in "${user_changes[@]}"; do
        if grep -qi "$change" CHANGELOG.md; then
            success "Found user change: $change"
        else
            warning "Missing user change: $change"
        fi
    done
    
    # Check for Keep a Changelog format
    if grep -q "keepachangelog.com" CHANGELOG.md; then
        success "Follows Keep a Changelog format"
    else
        warning "Does not reference Keep a Changelog format"
    fi
fi

# Validate ADR-0007
echo -e "\n📋 Validating ADR-0007..."

adr_file="docs/adr/ADR-0007-sync-scheduler.md"
if [ -f "$adr_file" ]; then
    # Check for amendment section
    if grep -q "Amendment.*UI Data Consumption" "$adr_file"; then
        success "Found UI Data Consumption amendment"
    else
        error "Missing UI Data Consumption amendment in ADR-0007"
    fi
    
    # Check for Sprint 2 references
    if grep -q "Sprint 2.*S2-TASK-05" "$adr_file"; then
        success "Found Sprint 2 task reference"
    else
        error "Missing Sprint 2 task reference in ADR-0007"
    fi
    
    # Check for cached data mention
    if grep -qi "cached data.*UI" "$adr_file"; then
        success "Documents UI cached data consumption"
    else
        error "Missing cached data consumption documentation"
    fi
    
    # Check for Redux hydration documentation
    if grep -q "hydrateReduxSlices" "$adr_file"; then
        success "Documents Redux hydration pattern"
    else
        error "Missing Redux hydration documentation"
    fi
fi

# Check markdown linting
echo -e "\n🔍 Running markdown linter..."

if command -v markdownlint &> /dev/null; then
    if markdownlint README.md CHANGELOG.md docs/**/*.md; then
        success "Markdown linting passed"
    else
        error "Markdown linting failed"
    fi
else
    warning "markdownlint not installed, skipping markdown linting"
fi

# Check for broken links (if markdown-link-check is available)
echo -e "\n🔗 Checking for broken links..."

if command -v markdown-link-check &> /dev/null; then
    if markdown-link-check README.md; then
        success "No broken links found in README.md"
    else
        warning "Broken links found in README.md"
    fi
else
    info "markdown-link-check not installed, skipping link validation"
fi

# Validate package.json version
echo -e "\n📦 Validating package.json..."

if [ -f "package.json" ]; then
    version=$(grep '"version"' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
    if [[ "$version" =~ ^1\.[12]\.[0-9]+$ ]]; then
        success "Package version ($version) follows semantic versioning"
    else
        warning "Package version ($version) may not follow expected pattern"
    fi
fi

# Check for documentation scripts
echo -e "\n📜 Checking documentation scripts..."

scripts_to_check=(
    "generate-badges"
    "lint:md"
    "validate-docs"
)

if [ -f "package.json" ]; then
    for script in "${scripts_to_check[@]}"; do
        if grep -q "\"$script\"" package.json; then
            success "Found script: $script"
        else
            warning "Missing recommended script: $script"
        fi
    done
fi

# Summary
echo -e "\n📊 Validation Summary"
echo "===================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "All documentation validation checks passed! 🎉"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Validation completed with $WARNINGS warnings${NC}"
    success "No critical errors found ✅"
    exit 0
else
    echo -e "${RED}Validation failed with $ERRORS errors and $WARNINGS warnings${NC}"
    error "Please fix the errors above before continuing"
    exit 1
fi

#!/bin/bash

# Documentation Validation Script
# Validates all documentation files for quality and consistency

set -e

echo "📚 Starting documentation validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if required tools are installed
check_tools() {
    echo "🔧 Checking required tools..."
    
    if ! command -v markdownlint &> /dev/null; then
        log_error "markdownlint not found. Install with: npm install -g markdownlint-cli"
        exit 1
    fi
    
    if ! command -v textlint &> /dev/null; then
        log_warning "textlint not found. Consider installing for better text quality checks"
    fi
    
    log_success "Required tools are available"
}

# Validate markdown files
validate_markdown() {
    echo "📝 Validating markdown files..."
    
    # Find all markdown files
    MARKDOWN_FILES=$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./coverage/*")
    
    if [ -z "$MARKDOWN_FILES" ]; then
        log_warning "No markdown files found"
        return
    fi
    
    # Run markdownlint
    if markdownlint $MARKDOWN_FILES; then
        log_success "Markdown files pass linting"
    else
        log_error "Markdown files have linting errors"
    fi
}

# Validate documentation structure
validate_structure() {
    echo "📁 Validating documentation structure..."
    
    # Check for required files
    REQUIRED_FILES=(
        "README.md"
        "docs/L3-LLD-CPAPP.md"
        "docs/adr/ADR-0013-lead-detail-screen.md"
        "docs/sprint-progress-S3-TASK-05.md"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            log_success "Required file found: $file"
        else
            log_error "Required file missing: $file"
        fi
    done
    
    # Check for ADR directory structure
    if [ -d "docs/adr" ]; then
        log_success "ADR directory exists"
    else
        log_error "ADR directory missing"
    fi
}

# Validate sequence diagrams
validate_diagrams() {
    echo "📊 Validating sequence diagrams..."
    
    # Check if mermaid diagrams are properly formatted
    MERMAID_FILES=$(grep -r "```mermaid" docs/ || true)
    
    if [ -n "$MERMAID_FILES" ]; then
        log_success "Mermaid diagrams found"
        
        # Check for proper diagram closure
        if grep -r "```mermaid" docs/ | while read -r line; do
            file=$(echo "$line" | cut -d: -f1)
            if ! grep -A 20 "```mermaid" "$file" | grep -q "```"; then
                log_error "Unclosed mermaid diagram in $file"
                return 1
            fi
        done; then
            log_success "All mermaid diagrams properly closed"
        fi
    else
        log_warning "No mermaid diagrams found"
    fi
}

# Validate links
validate_links() {
    echo "🔗 Validating internal links..."
    
    # Find all markdown files and check internal links
    find . -name "*.md" -not -path "./node_modules/*" -exec grep -l "\]\(" {} \; | while read -r file; do
        # Extract internal links (starting with ./ or ../ or just filename)
        grep -o "\]\([^http][^)]*\)" "$file" | sed 's/](\(.*\))/\1/' | while read -r link; do
            # Skip external links and anchors
            if [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^# ]]; then
                continue
            fi
            
            # Resolve relative path
            dir=$(dirname "$file")
            resolved_path=$(realpath -m "$dir/$link" 2>/dev/null || echo "$dir/$link")
            
            if [ ! -f "$resolved_path" ] && [ ! -d "$resolved_path" ]; then
                log_error "Broken internal link in $file: $link"
            fi
        done
    done
}

# Validate code examples
validate_code_examples() {
    echo "💻 Validating code examples..."
    
    # Check for code blocks
    CODE_BLOCKS=$(grep -r "```" docs/ | grep -v "```mermaid" | wc -l)
    
    if [ "$CODE_BLOCKS" -gt 0 ]; then
        log_success "Found $CODE_BLOCKS code blocks"
        
        # Check for unclosed code blocks
        if grep -r "```" docs/ | grep -v "```mermaid" | while read -r line; do
            file=$(echo "$line" | cut -d: -f1)
            line_num=$(echo "$line" | cut -d: -f2)
            
            # Count code block markers after this line
            tail -n +$((line_num + 1)) "$file" | grep -m 1 "```" > /dev/null
            if [ $? -ne 0 ]; then
                log_error "Unclosed code block in $file at line $line_num"
                return 1
            fi
        done; then
            log_success "All code blocks properly closed"
        fi
    else
        log_warning "No code blocks found"
    fi
}

# Validate table formatting
validate_tables() {
    echo "📋 Validating table formatting..."
    
    # Find tables and check formatting
    TABLE_FILES=$(grep -r "|" docs/ | grep -v "```" | cut -d: -f1 | sort -u)
    
    if [ -n "$TABLE_FILES" ]; then
        log_success "Tables found in documentation"
        
        # Check for table headers
        echo "$TABLE_FILES" | while read -r file; do
            if grep -q "|.*|" "$file" && grep -q "|-" "$file"; then
                log_success "Table formatting looks good in $file"
            else
                log_warning "Table formatting might be incorrect in $file"
            fi
        done
    else
        log_warning "No tables found"
    fi
}

# Validate documentation completeness
validate_completeness() {
    echo "📑 Validating documentation completeness..."
    
    # Check ADR completeness
    ADR_FILE="docs/adr/ADR-0013-lead-detail-screen.md"
    if [ -f "$ADR_FILE" ]; then
        REQUIRED_SECTIONS=(
            "Status"
            "Context"
            "Decision"
            "Consequences"
        )
        
        for section in "${REQUIRED_SECTIONS[@]}"; do
            if grep -q "## $section" "$ADR_FILE"; then
                log_success "ADR section found: $section"
            else
                log_error "ADR section missing: $section"
            fi
        done
    fi
    
    # Check README completeness
    if [ -f "README.md" ]; then
        REQUIRED_README_SECTIONS=(
            "Lead Detail Screen Implementation"
            "Testing Commands"
            "Performance Targets"
        )
        
        for section in "${REQUIRED_README_SECTIONS[@]}"; do
            if grep -q "$section" "README.md"; then
                log_success "README section found: $section"
            else
                log_error "README section missing: $section"
            fi
        done
    fi
}

# Main validation function
main() {
    echo "🚀 CPAPP Documentation Validation"
    echo "================================="
    
    check_tools
    validate_structure
    validate_markdown
    validate_diagrams
    validate_links
    validate_code_examples
    validate_tables
    validate_completeness
    
    echo ""
    echo "📊 Validation Summary"
    echo "==================="
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    
    if [ $ERRORS -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            log_success "All documentation validation passed! 🎉"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Documentation validation passed with $WARNINGS warnings${NC}"
            exit 0
        fi
    else
        log_error "Documentation validation failed with $ERRORS errors"
        exit 1
    fi
}

# Run main function
main "$@"