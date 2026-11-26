#!/usr/bin/env bash
# Builds build/lambda.zip for the API Lambda: backend/src plus the backend's
# production dependencies (versions from package-lock.json).
#
#   ./scripts/package-lambda.sh
#
# Dependencies are installed into a separate folder, so your own
# node_modules is never touched. Lambda handler: backend/src/lambda.handler
set -euo pipefail

cd "$(dirname "$0")/.."

STAGE=build/lambda
ZIP=build/lambda.zip

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE/backend" "$STAGE/frontend"

# npm ci needs the workspace layout to match the lockfile.
cp package.json package-lock.json "$STAGE/"
cp backend/package.json "$STAGE/backend/"
cp frontend/package.json "$STAGE/frontend/"
cp -R backend/src "$STAGE/backend/src"

(
  cd "$STAGE"
  npm ci --omit=dev --workspace backend --include-workspace-root=false \
    --ignore-scripts --no-audit --no-fund
)

# Keep only what the function runs: drop the workspace links, the frontend
# stub, the root manifests and the SQL migrations.
find "$STAGE/node_modules" -maxdepth 2 -type l -delete
find "$STAGE/node_modules" -maxdepth 1 -type d -empty -delete
rm -rf "$STAGE/frontend" "$STAGE/package.json" "$STAGE/package-lock.json" \
  "$STAGE/backend/src/database/migrations"

(cd "$STAGE" && zip -qr "../$(basename "$ZIP")" .)

echo "Built $ZIP ($(du -h "$ZIP" | cut -f1))"
