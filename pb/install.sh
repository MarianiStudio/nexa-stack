#!/bin/bash
set -e

# renovate: datasource=github-releases depName=pocketbase/pocketbase
PB_VERSION="0.39.8"

TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_NAME="pocketbase"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ARCH="arm64"
else
    echo "Architecture non supportée : $ARCH"
    exit 1
fi

FILE_NAME="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${FILE_NAME}"

echo "📥 Téléchargement de PocketBase v${PB_VERSION} pour ${OS}/${ARCH}..."
curl -sL "$DOWNLOAD_URL" -o "$TARGET_DIR/pb.zip"
unzip -o "$TARGET_DIR/pb.zip" "$BINARY_NAME" -d "$TARGET_DIR"
rm "$TARGET_DIR/pb.zip"
chmod +x "$TARGET_DIR/$BINARY_NAME"
echo "✅ PocketBase prêt dans $TARGET_DIR/$BINARY_NAME"
