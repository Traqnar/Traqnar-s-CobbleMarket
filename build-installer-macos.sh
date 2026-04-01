#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
FRONT="$ROOT/cobblemon-market-front/cobblemon-market-front"

if [ ! -f "$FRONT/package.json" ]; then
  echo "[ERROR] Frontend folder not found:"
  echo "$FRONT"
  exit 1
fi

cd "$FRONT"

if [ ! -d "node_modules" ]; then
  echo "[INFO] Installing npm dependencies..."
  npm install
fi

printf "Versionning avant build ? (y/N): "
read -r DO_VERSIONING

case "$DO_VERSIONING" in
  y|Y|o|O)
    echo "[INFO] Bumping app version patch..."
    npm version patch --no-git-tag-version
    ;;
  ""|n|N)
    echo "[INFO] Versionning skipped."
    ;;
  *)
    echo "[ERROR] Invalid choice. Answer y or n."
    exit 1
    ;;
esac

APP_VERSION="$(node -p "require('./package.json').version")"
echo "[INFO] Building macOS package version $APP_VERSION..."

npm run dist:mac

echo
echo "[OK] macOS package v$APP_VERSION generated in:"
echo "$FRONT/release"
