# agentv - Naukri Automation Chrome Extension

Chrome extension for automating Naukri.com candidate downloads and session management.

## Overview

This extension enables users to:
- Automate candidate downloads from job applications
- Upload downloaded files directly to the agentv platform

## Features
- 🤖 **Browser Automation**: Runs automation directly in the user's browser
- 📤 **Direct Upload**: Automatically uploads downloaded files to your server
- 🎯 **Easy Setup**: Simple configuration with API endpoint and Organization ID

## Installation

### Option 1: Load Unpacked (Development)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the repository directory

### Option 2: Install from Build

1. Download the latest `naukri-session-capture.zip` from [Releases](https://github.com/your-org/votalai-chrome-extension/releases)
2. Extract the zip file
3. Follow steps 2-5 from Option 1

## Configuration

After installing the extension:

1. Click the extension icon in Chrome
2. Enter your **Server API Endpoint** (e.g., `https://your-domain.com`)
3. Enter your **Organization ID**
4. Click "Save" (settings are automatically saved)

## Usage

### Downloading Candidates

1. **Navigate to Naukri.com** and log in
2. Go to a job listing and click on **"Total Responses"** (this takes you to the applications page)
3. Ensure the URL contains `/applies`
4. Click the extension icon
5. (Optional) Enter a job title for reference
6. Click **"📥 Download Candidates"**
7. The extension will:
   - Automatically select all candidates
   - Trigger the download
   - Capture the downloaded file
   - Upload it to your server

## Development

### Project Structure

```
.
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content-script.js      # Content script for Naukri pages
├── automation.js          # Automation logic
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
├── build-extension.sh     # Build script (Unix/Mac)
└── build-extension.ps1   # Build script (Windows)
```

### Building

#### Unix/Mac/Linux:
```bash
chmod +x build-extension.sh
./build-extension.sh
```

#### Windows:
```powershell
.\build-extension.ps1
```

This creates `naukri-session-capture.zip` ready for distribution.

### Testing

1. Load the extension in developer mode
2. Open Naukri.com and log in
3. Navigate to a job applications page
4. Test the automation flow

## API Integration

The extension communicates with your main application via:

- **Webhook Endpoint**: `POST /api/webhook/chrome-extension/naukri/csv-receiver`
  - Receives: FormData with file, orgId, jobTitle, fileSize, mimeType, timestamp
  - Returns: JSON response with success status

### Required Headers

The extension sends:
- `Content-Type: multipart/form-data` (automatically set by browser)

### Webhook Payload

```javascript
{
  file: File,           // The downloaded ZIP file
  orgId: string,        // Organization ID
  jobTitle: string,     // Job title (optional reference)
  fileSize: string,     // File size in bytes
  mimeType: string,     // MIME type (usually "application/zip")
  timestamp: string     // ISO timestamp
}
```

## Permissions

This extension requires the following permissions:

- `cookies` - To capture Naukri.com session cookies
- `storage` - To save user settings
- `tabs` - To interact with Naukri.com tabs
- `activeTab` - To access the current tab
- `scripting` - To inject automation scripts
- `downloads` - To intercept and capture downloads

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)

## Version History

### v1.0.1
- Initial release
- Session capture functionality
- Automated candidate downloads
- Direct file upload to server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: [Your Contact Info]

## Security

- All session data is handled locally in the browser
- Cookies are only sent to your configured API endpoint
- No data is stored or transmitted to third parties
- Source code is open for security review

