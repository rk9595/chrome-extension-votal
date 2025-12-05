# PowerShell build script for Naukri Session Exporter Chrome Extension
# This script creates a zip file ready for distribution

Write-Host "🔨 Building Naukri Session Exporter Chrome Extension..." -ForegroundColor Cyan

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Create icons directory if it doesn't exist
if (-not (Test-Path "icons")) {
    New-Item -ItemType Directory -Path "icons" | Out-Null
}

# Check if icons exist
$icon16 = "icons/icon16.png"
$icon48 = "icons/icon48.png"
$icon128 = "icons/icon128.png"

if (-not (Test-Path $icon16) -or -not (Test-Path $icon48) -or -not (Test-Path $icon128)) {
    Write-Host "⚠️  Warning: Icon files not found in icons/ directory" -ForegroundColor Yellow
    Write-Host "   Please create icon16.png, icon48.png, and icon128.png"
    Write-Host "   You can use any image editor or online tools to create these"
    Write-Host ""
}

# Remove old zip if exists
$zipFile = "naukri-session-capture.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
    Write-Host "🗑️  Removed old zip file" -ForegroundColor Gray
}

# Files to exclude
$excludePatterns = @(
    "*.git*",
    "*.DS_Store",
    "README.md",
    "build-extension.sh",
    "build-extension.ps1",
    "build.js",
    "package.json",
    "package-lock.json",
    ".github",
    "*.zip"
)

# Get all files to include
$filesToZip = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.FullName -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

# Create zip file
Write-Host "📦 Creating zip file..." -ForegroundColor Cyan
Compress-Archive -Path $filesToZip.FullName -DestinationPath $zipFile -Force

Write-Host "✅ Extension built successfully!" -ForegroundColor Green
Write-Host "📦 Output: $zipFile" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Load the extension in Chrome: chrome://extensions/"
Write-Host "   2. Enable Developer mode"
Write-Host "   3. Click 'Load unpacked' and select this directory"
Write-Host "   OR"
Write-Host "   1. Distribute $zipFile to users"
Write-Host "   2. Users should extract and load in Chrome"

