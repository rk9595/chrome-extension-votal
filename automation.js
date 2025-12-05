// Automation script for Naukri candidate download
// Runs directly in the user's browser via content script

(function () {
  'use strict';

  console.log('[agentv] Automation script loaded');

  // Helper function to wait for element
  async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Element not found: ${selector}`);
  }

  // Helper function to wait for element by text
  async function waitForElementByText(text, tagName = '*', timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const elements = Array.from(document.querySelectorAll(tagName));
      const element = elements.find((el) => {
        const elText = el.textContent?.trim() || '';
        const elTitle = el.getAttribute('title') || '';
        return elText.includes(text) || elTitle.includes(text);
      });
      if (element) return element;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Element with text "${text}" not found`);
  }

  // Helper function to sleep
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper function to click element
  async function clickElement(element) {
    if (!element) throw new Error('Element is null');

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);

    // Try multiple click methods
    if (element.click) {
      element.click();
    } else if (element.dispatchEvent) {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(clickEvent);
    } else {
      throw new Error('Cannot click element');
    }

    await sleep(500);
  }

  // Main automation function
  // Assumes user is already on the job applications page
  async function downloadCandidates(jobTitle) {
    try {
      console.log(
        '[agentv] Starting automation (assuming user is on applications page)'
      );

      // Verify we're on an applications page
      if (!window.location.href.includes('/applies')) {
        throw new Error(
          'Please navigate to the job applications page first (URL should contain "/applies")'
        );
      }

      // Wait for page to be fully loaded
      await sleep(2000);

      // Step 1: Click "Select All" checkbox
      console.log('[agentv] Clicking Select All checkbox...');
      const selectAllCheckbox = await waitForElement(
        'input[type="checkbox"][id="selectAll"]',
        10000
      );
      await clickElement(selectAllCheckbox);
      await sleep(1500);

      console.log('[agentv] Select All checkbox clicked');

      // Step 2: Set up download interception BEFORE clicking download
      console.log('[agentv] Setting up download interception...');

      let downloadData = null;
      let downloadResolve = null;
      const downloadPromise = new Promise((resolve) => {
        downloadResolve = resolve;
      });

      // Listen for download from background script
      const downloadMessageListener = (message, sender, sendResponse) => {
        if (message.action === 'downloadCaptured') {
          console.log('[agentv] Download captured via downloads API!');
          downloadData = message.downloadData;
          if (downloadResolve) downloadResolve(downloadData);
        } else if (message.action === 'downloadError') {
          console.error('[agentv] Download error:', message.error);
          if (downloadResolve) downloadResolve(null);
        } else if (message.action === 'fetchBlobDownload') {
          // Handle blob URL fetch request from background
          console.log('[agentv] Fetching blob download:', message.blobUrl);
          fetch(message.blobUrl)
            .then((response) => response.blob())
            .then((blob) => {
              // Convert blob to base64
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                downloadData = {
                  base64: base64,
                  fileName: message.filename || `candidates-${Date.now()}.zip`,
                  fileSize: blob.size,
                  mimeType: blob.type || 'application/zip'
                };
                console.log(
                  '[agentv] Blob download converted to base64:',
                  downloadData.fileName,
                  downloadData.fileSize
                );
                if (downloadResolve) downloadResolve(downloadData);
              };
              reader.readAsDataURL(blob);
            })
            .catch((err) => {
              console.error('[agentv] Error fetching blob:', err);
              if (downloadResolve) downloadResolve(null);
            });
          return true; // Keep channel open for async
        }
      };

      chrome.runtime.onMessage.addListener(downloadMessageListener);

      // Start download interception in background
      chrome.runtime.sendMessage(
        { action: 'startDownloadInterception' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              '[agentv] Error starting download interception:',
              chrome.runtime.lastError
            );
          } else {
            console.log('[agentv] Download interception started');
          }
        }
      );

      // Step 3: Click "Download" button
      // The download button is in a div with class "action allTab" containing:
      // - An icon with class "ore-download"
      // - A span with class "download-label" containing "Download"
      console.log('[agentv] Looking for Download button...');

      // Try multiple selectors for the download button
      let downloadBtn = document
        .querySelector('.action.allTab .ore-download')
        ?.closest('.action.allTab');

      if (!downloadBtn) {
        // Try finding by text
        downloadBtn = await waitForElementByText(
          'Download',
          'span, div, button, a',
          5000
        );
        // If found by text, get the parent action div
        if (downloadBtn && !downloadBtn.classList.contains('action')) {
          downloadBtn = downloadBtn.closest('.action.allTab') || downloadBtn;
        }
      }

      if (!downloadBtn) {
        throw new Error(
          'Download button not found. Make sure you are on the applications page.'
        );
      }

      console.log('[agentv] Found Download button, clicking...');

      // Set up a one-time fetch interceptor right before clicking
      let fetchIntercepted = false;
      const originalFetchBeforeClick = window.fetch;
      window.fetch = async function (...args) {
        const response = await originalFetchBeforeClick.apply(this, args);

        // Check if this is a download response (only intercept once)
        if (!fetchIntercepted) {
          const contentType = response.headers.get('content-type');
          const contentDisposition = response.headers.get(
            'content-disposition'
          );

          if (
            (contentType &&
              (contentType.includes('application/zip') ||
                contentType.includes('application/octet-stream') ||
                contentType.includes('application/x-zip-compressed'))) ||
            (contentDisposition && contentDisposition.includes('attachment'))
          ) {
            console.log(
              '[agentv] Download response intercepted via fetch (before click)!'
            );
            fetchIntercepted = true;

            const clonedResponse = response.clone();
            const blob = await clonedResponse.blob();

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              const capturedData = {
                base64: base64,
                fileName: contentDisposition
                  ? contentDisposition
                      .match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]
                      ?.replace(/['"]/g, '') || `candidates-${Date.now()}.zip`
                  : `candidates-${Date.now()}.zip`,
                fileSize: blob.size,
                mimeType: blob.type || 'application/zip'
              };
              downloadData = capturedData;
              if (downloadResolve) downloadResolve(capturedData);
            };
            reader.readAsDataURL(blob);
          }
        }

        return response;
      };

      await clickElement(downloadBtn);

      // Wait a bit for download to start
      await sleep(3000);

      // Restore fetch after a delay
      setTimeout(() => {
        if (window.fetch === originalFetchBeforeClick || fetchIntercepted) {
          // Already restored or intercepted
        } else {
          window.fetch = originalFetchBeforeClick;
        }
      }, 5000);

      // Wait for download to be captured (with longer timeout for large files)
      console.log('[agentv] Waiting for download to be captured...');
      try {
        downloadData = await Promise.race([
          downloadPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Download timeout')), 60000)
          ) // Increased to 60 seconds
        ]);
      } catch (error) {
        console.error('[agentv] Download capture timeout or error:', error);
        // Try one more time to check if download happened
        await sleep(2000);
        if (!downloadData) {
          console.warn('[agentv] Download was not captured after timeout');
          downloadData = null;
        }
      }

      // Clean up
      chrome.runtime.onMessage.removeListener(downloadMessageListener);
      chrome.runtime.sendMessage({ action: 'stopDownloadInterception' });

      // Restore fetch
      window.fetch = originalFetchBeforeClick;

      if (downloadData) {
        console.log(
          `[agentv] Download captured: ${downloadData.fileName} (${downloadData.fileSize} bytes)`
        );
      } else {
        console.warn(
          '[agentv] Download was not captured. File may have been downloaded to browser downloads folder.'
        );
      }

      return {
        success: true,
        message: 'Download completed',
        downloadBlob: downloadData
      };
    } catch (error) {
      console.error('[agentv] Automation error:', error);
      throw error;
    }
  }

  // Listen for automation requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadCandidates') {
      downloadCandidates(request.jobTitle)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          console.error('[agentv] Download error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }
  });

  // Export for direct use
  window.agentvAutomation = {
    downloadCandidates
  };
})();
