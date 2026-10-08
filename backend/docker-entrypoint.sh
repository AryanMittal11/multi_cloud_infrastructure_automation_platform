#!/bin/sh
set -e

# ==============================================================================
# Multi-Cloud Platform Backend Entrypoint Script
# ==============================================================================

echo "=================================================="
echo " Starting Multi-Cloud Platform Control Plane API"
echo "=================================================="

# Apply database migrations / schema push if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  echo "Applying Prisma database migrations..."
  npx prisma db push --skip-generate || echo "Database push failed or already synchronized, proceeding..."
  
  # Optionally seed database if RUN_SEED is enabled
  if [ "$RUN_SEED" = "true" ] || [ "$RUN_SEED" = "1" ]; then
    echo "Running database seed..."
    npx ts-node -T -r tsconfig-paths/register prisma/seed.ts || npm run prisma:seed || true
  fi
fi

# Ensure workspace directory exists
mkdir -p "${TERRAFORM_WORKSPACE_DIR:-./terraform_workspaces}"

echo "Starting Node.js application process..."
exec "$@"
