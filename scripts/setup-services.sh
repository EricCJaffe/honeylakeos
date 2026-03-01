#!/usr/bin/env bash
# setup-services.sh — Link Vercel and Supabase CLIs to the HoneylakeOS project.
# Run this from the repo root on a machine with internet access.
#
# Usage:
#   VERCEL_TOKEN=<token> SUPABASE_ACCESS_TOKEN=<token> ./scripts/setup-services.sh
#
# Or export the tokens first:
#   export VERCEL_TOKEN=vcp_...
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   ./scripts/setup-services.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SUPABASE_PROJECT_ID="umsibvxethuebdyjamxi"

echo "=== HoneylakeOS Service Setup ==="
echo ""

# ── Vercel ──────────────────────────────────────────────────────────

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo -e "${YELLOW}VERCEL_TOKEN not set — skipping Vercel setup.${NC}"
  echo "  Generate one at: https://vercel.com/account/tokens"
else
  echo "Checking Vercel auth..."
  if npx vercel whoami --token "$VERCEL_TOKEN" 2>/dev/null; then
    echo -e "${GREEN}Vercel authenticated.${NC}"
  else
    echo -e "${RED}Vercel token is invalid. Please check your token.${NC}"
    exit 1
  fi

  echo "Linking Vercel project..."
  npx vercel link --yes --token "$VERCEL_TOKEN"
  echo -e "${GREEN}Vercel project linked.${NC}"

  echo ""
  echo "Pulling Vercel environment variables..."
  npx vercel env pull .env.vercel --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
  echo ""

  echo "Setting required Vercel env vars (if not already set)..."
  # Read current .env values
  if [ -f .env ]; then
    VITE_SUPABASE_URL=$(grep '^VITE_SUPABASE_URL=' .env | cut -d'"' -f2)
    VITE_SUPABASE_PUBLISHABLE_KEY=$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' .env | cut -d'"' -f2)
    VITE_SUPABASE_PROJECT_ID=$(grep '^VITE_SUPABASE_PROJECT_ID=' .env | cut -d'"' -f2)

    for var in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_PROJECT_ID; do
      val="${!var:-}"
      if [ -n "$val" ]; then
        echo "  Setting $var in Vercel (production + preview + development)..."
        echo "$val" | npx vercel env add "$var" production preview development --token "$VERCEL_TOKEN" 2>/dev/null || \
          echo "  (already set or skipped)"
      fi
    done
  else
    echo -e "${YELLOW}No .env file found — skipping Vercel env var sync.${NC}"
  fi

  echo -e "${GREEN}Vercel setup complete.${NC}"
fi

echo ""

# ── Supabase ────────────────────────────────────────────────────────

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo -e "${YELLOW}SUPABASE_ACCESS_TOKEN not set — skipping Supabase CLI setup.${NC}"
  echo "  Generate one at: https://supabase.com/dashboard/account/tokens"
else
  echo "Checking Supabase auth..."
  if npx supabase projects list 2>/dev/null | head -5; then
    echo -e "${GREEN}Supabase authenticated.${NC}"
  else
    echo -e "${RED}Supabase token is invalid. Please check your token.${NC}"
    exit 1
  fi

  echo "Linking Supabase project ($SUPABASE_PROJECT_ID)..."
  npx supabase link --project-ref "$SUPABASE_PROJECT_ID"
  echo -e "${GREEN}Supabase project linked.${NC}"

  echo ""
  echo "Verifying edge function secrets..."
  echo "  Required secrets: RESEND_API_KEY, APP_URL, INTEGRATION_SECRET_KEY"
  echo "  Recommended: SOP_REVIEW_SCHEDULER_SECRET, EXIT_SURVEY_RETENTION_SECRET"
  echo "  Check these at: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/settings/functions"
  echo ""

  echo -e "${GREEN}Supabase setup complete.${NC}"
fi

echo ""
echo "=== Setup Summary ==="
echo "  Supabase project: $SUPABASE_PROJECT_ID"
echo "  Supabase URL:     https://$SUPABASE_PROJECT_ID.supabase.co"
echo "  Vercel config:    vercel.json (SPA rewrites)"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run build' to verify the build"
echo "  2. Run 'npx vercel --token \$VERCEL_TOKEN' for a preview deployment"
echo "  3. Run 'npx vercel --prod --token \$VERCEL_TOKEN' for production"
echo "  4. Check edge function secrets in the Supabase dashboard"
echo ""
