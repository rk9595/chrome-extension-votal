# Copy Icon Files

The icon files need to be copied from the original location to this repository.

## Manual Copy (Recommended)

1. Navigate to: `votal.ai\chrome-extension\naukri-session-capture\icons\`
2. Copy all `.png` files (icon16.png, icon32.png, icon48.png)
3. Paste them into: `chrome-extension-repo\icons\`

## Using PowerShell

Run this from the `chrome-extension-repo` directory:

```powershell
New-Item -ItemType Directory -Path "icons" -Force
Copy-Item -Path "..\votal.ai\chrome-extension\naukri-session-capture\icons\*" -Destination ".\icons\" -Recurse
```

## Using Command Prompt

```cmd
mkdir icons
xcopy /E /I /Y "..\votal.ai\chrome-extension\naukri-session-capture\icons" "icons"
```

## Required Icons

- `icon16.png` - 16x16 pixels (required)
- `icon48.png` - 48x48 pixels (required)
- `icon32.png` - 32x32 pixels (optional but recommended)

