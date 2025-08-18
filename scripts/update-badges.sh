#!/bin/bash

# Badge Update Script
# Updates README badges with current repository information

set -e

# Get repository information
REPO_OWNER=${1:-"your-org"}
REPO_NAME=${2:-"SOLARIUM-CPAPP"}
SONAR_PROJECT=${3:-"${REPO_OWNER}_${REPO_NAME}"}

echo "🏆 Updating badges for $REPO_OWNER/$REPO_NAME"

# Create backup of README
cp README.md README.md.backup

# Update badges in README.md
sed -i.tmp "s|your-org|$REPO_OWNER|g" README.md
sed -i.tmp "s|SOLARIUM-CPAPP|$REPO_NAME|g" README.md
sed -i.tmp "s|your-org_SOLARIUM-CPAPP|$SONAR_PROJECT|g" README.md

# Clean up temporary files
rm -f README.md.tmp

echo "✅ Badges updated successfully!"
echo "📋 Updated badges:"
echo "   CI: https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/mobile-ci.yml/badge.svg"
echo "   PR: https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/pr-check.yml/badge.svg"
echo "   Quality: https://sonarcloud.io/api/project_badges/measure?project=$SONAR_PROJECT&metric=alert_status"
echo ""
echo "🔧 To revert changes: mv README.md.backup README.md"