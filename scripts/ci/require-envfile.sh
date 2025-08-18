#!/bin/bash

# Environment File Validation Script
# Validates that ENVFILE is set and exists for CI/CD pipelines

set -e

echo "🔍 Validating environment configuration..."

# Check if ENVFILE environment variable is set
if [[ -z "$ENVFILE" ]]; then
    echo "❌ Error: ENVFILE environment variable is not set"
    echo ""
    echo "Available environment files:"
    ls -la .env.* 2>/dev/null || echo "  No .env.* files found"
    echo ""
    echo "Usage in CI:"
    echo "  export ENVFILE=.env.development"
    echo "  export ENVFILE=.env.staging"
    echo "  export ENVFILE=.env.production"
    echo ""
    exit 1
fi

# Check if the specified environment file exists
if [[ ! -f "$ENVFILE" ]]; then
    echo "❌ Error: Environment file '$ENVFILE' does not exist"
    echo ""
    echo "Available environment files:"
    ls -la .env.* 2>/dev/null || echo "  No .env.* files found"
    echo ""
    exit 1
fi

# Validate environment file contents
if [[ ! -s "$ENVFILE" ]]; then
    echo "❌ Error: Environment file '$ENVFILE' is empty"
    exit 1
fi

# Check for required environment variables
required_vars=("REACT_APP_BASE_URL" "REACT_APP_ENV")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$ENVFILE"; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "❌ Error: Missing required environment variables in '$ENVFILE':"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    exit 1
fi

# Success
echo "✅ Environment validation passed"
echo "   File: $ENVFILE"
echo "   Environment: $(grep '^REACT_APP_ENV=' "$ENVFILE" | cut -d'=' -f2)"
echo "   API URL: $(grep '^REACT_APP_BASE_URL=' "$ENVFILE" | cut -d'=' -f2)"