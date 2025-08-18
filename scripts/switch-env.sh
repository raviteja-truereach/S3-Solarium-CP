#!/bin/bash

# Environment Switch Script
# Usage: ./scripts/switch-env.sh [development|staging|production]

set -e

ENV=${1:-development}

if [[ ! "$ENV" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENV'"
    echo "Usage: $0 [development|staging|production]"
    exit 1
fi

echo "🔄 Switching to $ENV environment..."

# Copy the appropriate .env file
cp ".env.$ENV" ".env"

echo "✅ Environment switched to $ENV"
echo "📋 Current configuration:"
echo "   API URL: $(grep REACT_APP_BASE_URL .env | cut -d '=' -f2)"
echo "   Environment: $(grep REACT_APP_ENV .env | cut -d '=' -f2)"
echo "   Debug Mode: $(grep REACT_APP_DEBUG_MODE .env | cut -d '=' -f2)"

echo ""
echo "🚀 Rebuild the app to see changes:"
echo "   yarn android"
echo "   yarn ios"