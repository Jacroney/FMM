#!/bin/bash

# Plaid Deployment Script for Supabase
set -e

echo "🚀 Deploying Plaid Integration to Supabase"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists and has Plaid credentials
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Extract Plaid credentials from .env
PLAID_CLIENT_ID=$(grep VITE_PLAID_CLIENT_ID .env | cut -d '=' -f2 | tr -d '"')
PLAID_SECRET=$(grep PLAID_SECRET .env | cut -d '=' -f2 | tr -d '"')
PLAID_ENV=$(grep VITE_PLAID_ENV .env | cut -d '=' -f2 | tr -d '"')

# Default to sandbox if not set
PLAID_ENV=${PLAID_ENV:-sandbox}

echo "📝 Checking Plaid credentials in .env..."
if [ -z "$PLAID_CLIENT_ID" ]; then
    echo -e "${YELLOW}⚠️  VITE_PLAID_CLIENT_ID not found in .env${NC}"
    read -p "Enter your Plaid Client ID: " PLAID_CLIENT_ID
    echo "VITE_PLAID_CLIENT_ID=$PLAID_CLIENT_ID" >> .env
fi

if [ -z "$PLAID_SECRET" ]; then
    echo -e "${YELLOW}⚠️  PLAID_SECRET not found in .env${NC}"
    read -p "Enter your Plaid Secret: " PLAID_SECRET
    echo "PLAID_SECRET=$PLAID_SECRET" >> .env
fi

if [ -z "$PLAID_ENV" ]; then
    echo "VITE_PLAID_ENV=sandbox" >> .env
    PLAID_ENV="sandbox"
fi

echo -e "${GREEN}✅ Plaid credentials loaded${NC}"
echo ""

# Check for Supabase access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}🔑 Supabase Access Token Required${NC}"
    echo ""
    echo "Please get your access token from:"
    echo "👉 https://supabase.com/dashboard/account/tokens"
    echo ""
    read -p "Paste your Supabase Access Token: " SUPABASE_ACCESS_TOKEN
    export SUPABASE_ACCESS_TOKEN
fi

echo -e "${GREEN}✅ Access token set${NC}"
echo ""

# Link to Supabase project
PROJECT_REF="ffgeptjhhhifuuhjlsow"
echo "🔗 Linking to Supabase project..."

if supabase link --project-ref $PROJECT_REF 2>/dev/null; then
    echo -e "${GREEN}✅ Linked to project${NC}"
else
    echo -e "${YELLOW}⚠️  Already linked or link failed (continuing...)${NC}"
fi
echo ""

# Set Plaid secrets
echo "🔐 Setting Plaid secrets in Supabase..."
supabase secrets set PLAID_CLIENT_ID="$PLAID_CLIENT_ID"
supabase secrets set PLAID_SECRET="$PLAID_SECRET"
supabase secrets set PLAID_ENV="$PLAID_ENV"
echo -e "${GREEN}✅ Secrets configured${NC}"
echo ""

# Deploy Edge Function
echo "🚀 Deploying plaid-sync Edge Function..."
supabase functions deploy plaid-sync --no-verify-jwt
echo -e "${GREEN}✅ Edge function deployed${NC}"
echo ""

# Run database migrations
echo "📊 Running database migrations..."
echo ""
echo "To complete setup, run these SQL scripts in Supabase SQL Editor:"
echo "1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy & paste staging_reconciliation.sql → Run"
echo "3. Copy & paste plaid_setup.sql → Run"
echo ""

read -p "Press Enter when migrations are complete..."

echo ""
echo -e "${GREEN}🎉 Plaid Integration Deployed Successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Start your dev server: npm run dev"
echo "2. Go to /plaid-sync"
echo "3. Click 'Link Bank Account'"
echo "4. Use test credentials:"
echo "   - Username: user_good"
echo "   - Password: pass_good"
echo "   - MFA: 1234"
echo ""
echo "📚 See PLAID_SETUP.md for full documentation"
