# Setup Instructions

## Quick Start

1. **Copy Icon Files** (if not already done):
   ```powershell
   # From the main repo, copy icons:
   Copy-Item -Path "..\votal.ai\chrome-extension\naukri-session-capture\icons\*" -Destination ".\icons\" -Recurse
   ```

2. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Chrome extension for Naukri automation"
   ```

3. **Create GitHub Repository**:
   - Go to GitHub and create a new repository (e.g., `votalai-chrome-extension`)
   - Don't initialize with README (we already have one)
   - Then run:
   ```bash
   git remote add origin https://github.com/your-org/votalai-chrome-extension.git
   git branch -M main
   git push -u origin main
   ```

4. **Build the Extension**:
   ```bash
   # Windows:
   .\build-extension.ps1
   
   # Unix/Mac/Linux:
   ./build-extension.sh
   
   # Or using Node.js:
   npm run build
   ```

## What's Been Created

✅ Complete extension source code:
- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `content-script.js` - Content script for Naukri pages
- `automation.js` - Automation logic
- `popup.html` & `popup.js` - Extension UI

✅ Build scripts:
- `build-extension.sh` - Unix/Mac/Linux build script
- `build-extension.ps1` - Windows PowerShell build script
- `build.js` - Cross-platform Node.js build script

✅ Documentation:
- `README.md` - Complete documentation
- `.gitignore` - Git ignore rules
- `package.json` - NPM package configuration

## Next Steps

1. Copy icon files from the original location
2. Initialize git and push to GitHub
3. Build the extension zip file
4. Test the extension locally
5. Distribute to users or publish to Chrome Web Store

## Integration with Main App

The extension communicates with your main application via:
- **Webhook**: `POST /api/webhook/chrome-extension/naukri/csv-receiver`
- **Base URL**: Configured by user in extension popup

The main app should continue serving the zip file at:
- `/chrome-extension/naukri-session-capture.zip` (optional - can be served from this repo instead)

