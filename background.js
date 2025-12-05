// Background service worker for agentv - Naukri Automation
// Handles session capture coordination and secure export

chrome.runtime.onInstalled.addListener(() => {
  console.log('[agentv] Extension installed');
});

// Download interception for Naukri candidate downloads
let pendingDownload = null;
let downloadListener = null;
let interceptionTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startDownloadInterception') {
    console.log(
      '[agentv] Starting download interception for tab:',
      sender.tab?.id
    );
    interceptionTabId = sender.tab?.id;

    // Set up download listener
    if (downloadListener) {
      chrome.downloads.onCreated.removeListener(downloadListener);
    }

    downloadListener = (downloadItem) => {
      console.log('[agentv] Download event triggered:', {
        id: downloadItem.id,
        url: downloadItem.url,
        filename: downloadItem.filename,
        mime: downloadItem.mime,
        state: downloadItem.state,
        totalBytes: downloadItem.totalBytes
      });

      // Check if this is a Naukri download (ZIP file)
      if (
        downloadItem.url &&
        (downloadItem.url.includes('naukri.com') ||
          downloadItem.url.includes('naukrigulf.com') ||
          downloadItem.url.startsWith('blob:'))
      ) {
        console.log('[agentv] Detected Naukri download:', {
          url: downloadItem.url,
          filename: downloadItem.filename,
          mime: downloadItem.mime,
          state: downloadItem.state
        });

        // Check if it's a ZIP file (by URL, filename, or mime type)
        const isZip =
          downloadItem.filename?.endsWith('.zip') ||
          downloadItem.url.includes('.zip') ||
          downloadItem.mime === 'application/zip' ||
          downloadItem.mime === 'application/x-zip-compressed' ||
          downloadItem.mime === 'application/octet-stream' ||
          downloadItem.url.startsWith('blob:'); // Blob URLs are often downloads

        if (isZip) {
          console.log(
            '[agentv] Intercepted Naukri ZIP download:',
            downloadItem.filename || downloadItem.url
          );

          // Store download info
          pendingDownload = {
            id: downloadItem.id,
            filename: downloadItem.filename || `candidates-${Date.now()}.zip`,
            url: downloadItem.url
          };

          // For blob URLs, we need to handle them differently
          if (downloadItem.url.startsWith('blob:')) {
            console.log(
              '[agentv] Detected blob URL - requesting content script to fetch it'
            );
            // Ask content script to fetch the blob (it has access to blob URLs)
            if (interceptionTabId) {
              chrome.tabs
                .sendMessage(interceptionTabId, {
                  action: 'fetchBlobDownload',
                  blobUrl: downloadItem.url,
                  filename:
                    downloadItem.filename || `candidates-${Date.now()}.zip`
                })
                .catch((err) =>
                  console.error('[agentv] Error requesting blob fetch:', err)
                );
            }
            // Cancel the download
            chrome.downloads.cancel(downloadItem.id);
            return;
          }

          // For regular URLs, fetch from background
          // Cancel the download (we'll read it ourselves)
          chrome.downloads.cancel(downloadItem.id);

          // Fetch the file ourselves
          fetch(downloadItem.url)
            .then((response) => response.blob())
            .then((blob) => {
              // Convert blob to base64
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:application/zip;base64, prefix

                // Send to content script
                if (interceptionTabId) {
                  chrome.tabs
                    .sendMessage(interceptionTabId, {
                      action: 'downloadCaptured',
                      downloadData: {
                        base64: base64,
                        fileName:
                          downloadItem.filename?.split('/').pop() ||
                          downloadItem.filename ||
                          `candidates-${Date.now()}.zip`,
                        fileSize: blob.size,
                        mimeType: blob.type || 'application/zip'
                      }
                    })
                    .catch((err) =>
                      console.error(
                        '[agentv] Error sending download to content script:',
                        err
                      )
                    );
                }
              };
              reader.readAsDataURL(blob);
            })
            .catch((err) => {
              console.error('[agentv] Error fetching download:', err);
              if (interceptionTabId) {
                chrome.tabs.sendMessage(interceptionTabId, {
                  action: 'downloadError',
                  error: err.message
                });
              }
            });
        }
      }
    };

    chrome.downloads.onCreated.addListener(downloadListener);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'stopDownloadInterception') {
    console.log('[agentv] Stopping download interception...');
    if (downloadListener) {
      chrome.downloads.onCreated.removeListener(downloadListener);
      downloadListener = null;
    }
    pendingDownload = null;
    interceptionTabId = null;
    sendResponse({ success: true });
    return true;
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageLoaded') {
    console.log('[agentv] Page loaded:', request.url);
    // Could update badge or icon here
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureSessionFromBackground') {
    // Capture session data directly from background (has cookie permissions)
    captureSessionFromBackground()
      .then((sessionData) => {
        sendResponse({ success: true, data: sessionData });
      })
      .catch((error) => {
        console.error(
          '[agentv] Error capturing session from background:',
          error
        );
        sendResponse({
          success: false,
          error: error.message || 'Failed to capture session'
        });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'checkLoginStatusFromBackground') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (
        tabs[0] &&
        tabs[0].url &&
        (tabs[0].url.includes('naukri.com') ||
          tabs[0].url.includes('naukrigulf.com'))
      ) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'checkLoginStatus' },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message
              });
            } else {
              sendResponse(response);
            }
          }
        );
      } else {
        sendResponse({
          success: false,
          isLoggedIn: false,
          error: 'Please navigate to a Naukri.com page first'
        });
      }
    });
    return true;
  }
});

// Function to capture session data directly from background script
async function captureSessionFromBackground() {
  try {
    const sessionData = {
      url: '',
      domain: 'naukri.com',
      timestamp: new Date().toISOString(),
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      userAgent: navigator?.userAgent || 'Chrome Extension'
    };

    // Find all Naukri tabs to get the current URL
    const naukriTabs = await chrome.tabs.query({
      url: [
        '*://*.naukri.com/*',
        '*://*.naukrigulf.com/*',
        '*://resdex.naukri.com/*'
      ]
    });

    if (naukriTabs.length > 0) {
      // Use the most recently active Naukri tab
      const activeTab = naukriTabs.find((tab) => tab.active) || naukriTabs[0];
      sessionData.url =
        activeTab.url || 'https://www.naukri.com/recruiter/homepage';
      try {
        if (activeTab.url) {
          sessionData.domain = new URL(activeTab.url).hostname || 'naukri.com';
        }
      } catch (e) {
        // If URL parsing fails, extract domain manually
        const match = activeTab.url?.match(/https?:\/\/([^\/]+)/);
        sessionData.domain = match ? match[1] : 'naukri.com';
      }
    } else {
      // Default URL if no Naukri tab is open
      sessionData.url = 'https://www.naukri.com/recruiter/homepage';
      sessionData.domain = 'naukri.com';
    }

    // Capture cookies for all Naukri domains (background has cookie permissions)
    const cookieDomains = [
      '.naukri.com',
      'www.naukri.com',
      'hiring.naukri.com',
      'resdex.naukri.com',
      '.naukrigulf.com',
      'www.naukrigulf.com'
    ];

    for (const domain of cookieDomains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: domain });
        sessionData.cookies.push(
          ...cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate
          }))
        );
      } catch (error) {
        console.warn(`[agentv] Could not get cookies for ${domain}:`, error);
      }
    }

    // Try to get localStorage and sessionStorage from content script if available
    if (naukriTabs.length > 0) {
      try {
        const activeTab = naukriTabs.find((tab) => tab.active) || naukriTabs[0];
        const storageResponse = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'getStorage' },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve(null);
              } else {
                resolve(response);
              }
            }
          );
        });

        if (storageResponse && storageResponse.success) {
          sessionData.localStorage = storageResponse.localStorage || {};
          sessionData.sessionStorage = storageResponse.sessionStorage || {};
          if (storageResponse.userInfo) {
            sessionData.userInfo = storageResponse.userInfo;
          }
        }
      } catch (error) {
        console.warn(
          '[agentv] Could not get storage from content script:',
          error
        );
        // Continue without storage data - cookies are the most important
      }
    }

    // Validate that we have cookies
    if (sessionData.cookies.length === 0) {
      throw new Error(
        'No cookies found. Please ensure you are logged in to Naukri.com and try again.'
      );
    }

    console.log(
      `[agentv] Captured ${sessionData.cookies.length} cookies from background`
    );
    return sessionData;
  } catch (error) {
    console.error('[agentv] Error in captureSessionFromBackground:', error);
    throw error;
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this will be handled by the popup.html)
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});
