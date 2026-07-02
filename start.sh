#!/bin/sh
# ============================================================================
# Samsa startup script
# ============================================================================
# The /app/backend/data directory is mounted as a Railway persistent volume.
# On first boot (empty volume) we seed it with the default JSON files baked
# into the image. On subsequent deploys the volume already has live data, so
# we leave it untouched — preventing data loss on redeploy.
# ============================================================================

DATA_DIR="/app/backend/data"
DEFAULTS_DIR="/app/backend/data-defaults"

echo "🚀 Starting Samsa..."

# Seed each file only if it doesn't already exist on the volume
for file in markets.json info_events.json; do
  if [ ! -f "$DATA_DIR/$file" ]; then
    echo "  ⬇️  Seeding $file from defaults"
    cp "$DEFAULTS_DIR/$file" "$DATA_DIR/$file"
  else
    echo "  ✅ $file already exists — keeping live data"
  fi
done

# Ensure runtime files exist (empty arrays if not yet created)
for file in predictions.json users.json transactions.json; do
  if [ ! -f "$DATA_DIR/$file" ]; then
    echo "  ⬇️  Initialising $file as empty"
    echo "[]" > "$DATA_DIR/$file"
  else
    echo "  ✅ $file already exists — keeping live data"
  fi
done

echo "✅ Data directory ready"
exec node backend/server.js
