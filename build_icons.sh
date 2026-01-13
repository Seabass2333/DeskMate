#!/bin/bash

# Directory setup
BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

ICONSET="$BUILD_DIR/icon.iconset"
mkdir -p "$ICONSET"

SOURCE="assets/images/icon.png"
TRAY_SOURCE="assets/images/iconTemplate.png"

echo "🎨 Generatings Icons from $SOURCE..."

# 1. Generate Application Icons (.iconset -> .icns)
# macOS requires various sizes
sips -s format png -z 16 16     "$SOURCE" --out "$ICONSET/icon_16x16.png"
sips -s format png -z 32 32     "$SOURCE" --out "$ICONSET/icon_16x16@2x.png"
sips -s format png -z 32 32     "$SOURCE" --out "$ICONSET/icon_32x32.png"
sips -s format png -z 64 64     "$SOURCE" --out "$ICONSET/icon_32x32@2x.png"
sips -s format png -z 128 128   "$SOURCE" --out "$ICONSET/icon_128x128.png"
sips -s format png -z 256 256   "$SOURCE" --out "$ICONSET/icon_128x128@2x.png"
sips -s format png -z 256 256   "$SOURCE" --out "$ICONSET/icon_256x256.png"
sips -s format png -z 512 512   "$SOURCE" --out "$ICONSET/icon_256x256@2x.png"
sips -s format png -z 512 512   "$SOURCE" --out "$ICONSET/icon_512x512.png"
sips -s format png -z 1024 1024 "$SOURCE" --out "$ICONSET/icon_512x512@2x.png"

# Convert to icns
iconutil -c icns "$ICONSET" -o "$BUILD_DIR/icon.icns"
rm -rf "$ICONSET"

# 2. Copy/Generate PNG for Linux/Windows build resource
# Some systems use build/icon.png
sips -s format png -z 1024 1024 "$SOURCE" --out "$BUILD_DIR/icon.png"

# 3. Optimize Tray Icon (Resize to reasonable dims, e.g. 44x44 for 2x retina)
# User provided iconTemplate.png which affects tray.
# We'll generate a sized-down version for runtime usage to save memory/load time.
TRAY_DEST="assets/images/tray-icon-optimized.png"
sips -s format png -z 44 44 "$TRAY_SOURCE" --out "$TRAY_DEST"

echo "✅ Icons generated in $BUILD_DIR"
echo "✅ Tray icon optimized to $TRAY_DEST"
ls -l "$BUILD_DIR/icon.icns"
