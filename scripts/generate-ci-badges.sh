#!/bin/bash

# CI Badge Generator
# Generates markdown badges for README

set -e

REPO_OWNER=${1:-"your-org"}
REPO_NAME=${2:-"SOLARIUM-CPAPP"}

echo "🏆 Generating CI badges for $REPO_OWNER/$REPO_NAME"

cat << EOF
# CI/CD Status Badges

Add these badges to your README.md:

## Build Status
![CI](https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/mobile-ci.yml/badge.svg)
![PR Checks](https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/pr-check.yml/badge.svg)

## Code Quality
![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=alert_status)

## Security
![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=security_rating)
![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=vulnerabilities)

## Maintainability
![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=sqale_rating)
![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=sqale_index)

## Usage in README.md

\`\`\`markdown
# Solarium CP App

[![CI](https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/mobile-ci.yml/badge.svg)](https://github.com/$REPO_OWNER/$REPO_NAME/actions/workflows/mobile-ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)](https://github.com/$REPO_OWNER/$REPO_NAME/actions)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=${REPO_OWNER}_${REPO_NAME}&metric=alert_status)](https://sonarcloud.io/dashboard?id=${REPO_OWNER}_${REPO_NAME})

React Native Channel Partner Mobile Application
\`\`\`
EOF