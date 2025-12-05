#!/bin/bash

# Build script for Naukri Session Exporter Chrome Extension
# This script creates a zip file ready for distribution

echo "🔨 Building Naukri Session Exporter Chrome Extension..."

# Change to extension directory
cd "$(dirname "$0")"

# Create icons directory if it doesn't exist
mkdir -p icons

# Check if icons exist, if not create placeholder message
if [ ! -f "icons/icon16.png" ] || [ ! -f "icons/icon48.png" ] || [ ! -f "icons/icon128.png" ]; then
    echo "⚠️  Warning: Icon files not found in icons/ directory"
    echo "   Please create icon16.png, icon48.png, and icon128.png"
    echo "   You can use any image editor or online tools to create these"
    echo ""
    echo "   For now, creating placeholder icons..."
    
    # Create simple placeholder icons using ImageMagick (if available)
    if command -v convert &> /dev/null; then
        convert -size 16x16 xc:blue icons/icon16.png
        convert -size 48x48 xc:blue icons/icon48.png
        convert -size 128x128 xc:blue icons/icon128.png
        echo "   ✅ Created placeholder icons"
    else
        echo "   ⚠️  ImageMagick not found. Please create icons manually."
    fi
fi

# Remove old zip if exists
rm -f naukri-session-capture.zip

# Create zip file (excluding git, README, and build script)
zip -r naukri-session-capture.zip . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "README.md" \
    -x "build-extension.sh" \
    -x "*.zip"

echo "✅ Extension built successfully!"
echo "📦 Output: naukri-session-capture.zip"
echo ""
echo "📝 Next steps:"
echo "   1. Load the extension in Chrome: chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked' and select this directory"
echo "   OR"
echo "   1. Distribute naukri-session-capture.zip to users"
echo "   2. Users should extract and load in Chrome"

