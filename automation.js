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

  function splitValues(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return raw
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  async function clearSuggestorChips(wrapper) {
    if (!wrapper) return;
    const removableSelectors = [
      '.naukri-icon-cross',
      '.naukri-icon-close',
      '.ico-close',
      '.ico-cross',
      '.chip-close',
      '.tag-remove',
      '.suggestor-tag .ico',
      '.suggestor-tag button',
      '.suggestor-tag .remove'
    ];

    removableSelectors.forEach((selector) => {
      wrapper.querySelectorAll(selector).forEach((btn) => {
        if (btn instanceof HTMLElement) {
          btn.click();
        }
      });
    });

    await sleep(300);
  }

  async function typeAndCommitValue(input, value) {
    if (!input) return;
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(350);

    const keyboardOptions = {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    };

    input.dispatchEvent(new KeyboardEvent('keydown', keyboardOptions));
    input.dispatchEvent(new KeyboardEvent('keyup', keyboardOptions));
    await sleep(400);
  }

  async function fillSuggestorInput(selector, values = [], timeout = 10000) {
    const input = await waitForElement(selector, timeout);
    if (!(input instanceof HTMLInputElement)) return;
    const normalizedValues = splitValues(values);
    const wrapper =
      input.closest('.suggestor-wrapper') ||
      input.closest('.suggestor-box') ||
      input.parentElement;

    await clearSuggestorChips(wrapper);

    if (normalizedValues.length === 0) {
      return;
    }

    for (const value of normalizedValues) {
      await typeAndCommitValue(input, value);
    }
  }

  async function setSimpleInputValue(selector, value, timeout = 8000) {
    const input = await waitForElement(selector, timeout);
    if (!(input instanceof HTMLInputElement)) return;
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (value !== null && value !== undefined && value !== '') {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    await sleep(300);
  }

  function cleanText(value) {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
  }

  function getTextFromSelector(root, selector) {
    if (!root || !selector) return '';
    const el = root.querySelector(selector);
    return cleanText(el?.textContent || '');
  }

  function extractSkillTags(root) {
    if (!root) return [];
    const skills = Array.from(
      root.querySelectorAll('.key-skills .cand-skill button span')
    )
      .map((el) => cleanText(el?.textContent || ''))
      .filter(Boolean);
    return Array.from(new Set(skills));
  }

  function normalizePhoneCandidate(text) {
    if (!text) return '';
    const lowered = text.toLowerCase();
    if (
      lowered.includes('view phone') ||
      lowered.includes('verified phone') ||
      lowered.includes('call candidate')
    ) {
      // Might include digits later; keep only if digits are present
      const digits = text.replace(/\D/g, '');
      if (digits.length >= 10) {
        return text;
      }
      return '';
    }
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10) {
      return text.trim();
    }
    return '';
  }

  function findPhoneNumberInElement(element) {
    if (!element) return '';
    const phoneSelectors = [
      '.phone-number',
      '.contact-number',
      '.candidate-contact-info',
      '.candidate-phone-number',
      '.AAJ2m',
      '[data-testid="candidate-phone"]'
    ];

    for (const selector of phoneSelectors) {
      const txt = cleanText(element.querySelector(selector)?.textContent || '');
      const phone = normalizePhoneCandidate(txt);
      if (phone) return phone;
    }

    const textElements = element.querySelectorAll('span, div, button, a, p');
    for (const el of textElements) {
      const txt = cleanText(el.textContent || '');
      const phone = normalizePhoneCandidate(txt);
      if (phone) return phone;
    }

    return '';
  }

  async function revealPhoneNumber(tupleElement) {
    let phone = findPhoneNumberInElement(tupleElement);
    if (phone) return phone;

    const phoneButton = Array.from(
      tupleElement.querySelectorAll('button')
    ).find((btn) =>
      cleanText(btn.textContent || '')
        .toLowerCase()
        .includes('view phone')
    );

    if (phoneButton) {
      phoneButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneButton.click();
      await sleep(1500);
      phone = findPhoneNumberInElement(tupleElement);
      if (phone) return phone;
    }

    const verificationText = cleanText(
      tupleElement.querySelector('.candidate-verification-status')
        ?.textContent || ''
    );
    if (verificationText.toLowerCase().includes('verified phone')) {
      return 'Verified (number not accessible)';
    }

    return '';
  }

  function extractCandidateFromTuple(tupleElement, index) {
    const candidate = {
      id:
        tupleElement.getAttribute('data-tuple-id') ||
        `naukri-candidate-${index}`,
      name: '',
      title: '',
      experience: '',
      location: '',
      skills: [],
      currentCompany: '',
      education: '',
      salary: '',
      phone: '',
      email: '',
      profileUrl: '',
      resumeUrl: '',
      lastActive: '',
      summary: '',
      matchScore: 0
    };

    const card =
      tupleElement.querySelector('.flex-row.tuple-top') || tupleElement;

    const nameAnchor =
      card.querySelector('.candidate-name') || card.querySelector('a[title]');
    if (nameAnchor) {
      candidate.name = cleanText(nameAnchor.textContent || '');
      if ('href' in nameAnchor) {
        candidate.profileUrl = nameAnchor.href;
      }
    }

    candidate.experience = getTextFromSelector(
      card,
      '.meta-data .ico-work + span'
    );
    candidate.salary = getTextFromSelector(
      card,
      '.meta-data .ico-account_balance_wallet + span'
    );
    candidate.location = getTextFromSelector(
      card,
      '.meta-data .ico-place + span, .meta-data .location'
    );

    const employmentDetail = card.querySelector('#prevEmp .employment-detail');
    if (employmentDetail) {
      const buttons = employmentDetail.querySelectorAll('button span');
      if (buttons.length > 0) {
        candidate.title = cleanText(buttons[0]?.textContent || '');
      }
      if (buttons.length > 1) {
        candidate.currentCompany = cleanText(
          buttons[buttons.length - 1]?.textContent || ''
        );
      }
    }

    candidate.education = getTextFromSelector(card, '#education .education');
    candidate.skills = extractSkillTags(card);

    const summaryEl = card.querySelector('.candidate-profile-summary');
    if (summaryEl) {
      candidate.summary = cleanText(summaryEl.textContent || '');
    }

    const activeInfo = tupleElement.querySelector(
      '.tuple-footer_tuple-meta__wrH3M span:last-child'
    );
    if (activeInfo) {
      candidate.lastActive = cleanText(activeInfo.textContent || '');
    }

    const avatarImg = tupleElement.querySelector('.candidate-avatar img');
    if (avatarImg && avatarImg.src) {
      candidate.resumeUrl = avatarImg.src;
    }

    return candidate;
  }

  async function collectNaukriCandidates(criteria = {}) {
    if (!window.location.href.includes('resdex.naukri.com')) {
      throw new Error(
        'Please run this from the Naukri Resdex search results page.'
      );
    }

    let tupleElements = Array.from(
      document.querySelectorAll('.tuple[data-tuple-id]')
    );
    if (!tupleElements.length) {
      tupleElements = Array.from(document.querySelectorAll('.tuple'));
    }
    if (!tupleElements.length) {
      tupleElements = Array.from(
        document.querySelectorAll('.flex-row.tuple-top')
      );
    }

    tupleElements = tupleElements.filter((el) =>
      el.querySelector('.candidate-name')
    );

    if (!tupleElements || tupleElements.length === 0) {
      throw new Error(
        'No candidate cards detected. Scroll through the results and try again.'
      );
    }

    const requestedLimit = Number(criteria.limit) || 20;
    const limit = Math.min(
      Math.max(Math.round(requestedLimit), 1),
      tupleElements.length
    );
    const candidates = [];
    const seenNames = new Set();

    for (let i = 0; i < limit; i++) {
      const tupleElement = tupleElements[i];
      tupleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      try {
        const candidate = extractCandidateFromTuple(tupleElement, i);
        if (!candidate.name) {
          continue;
        }
        const normalizedName = candidate.name.toLowerCase();
        if (seenNames.has(normalizedName)) {
          continue;
        }

        let phone = await revealPhoneNumber(tupleElement);
        if (!phone) {
          phone = 'Phone not available';
        }
        candidate.phone = phone;

        seenNames.add(normalizedName);
        candidates.push(candidate);
      } catch (error) {
        console.warn('[agentv] Skipping candidate due to error:', error);
      }

      await sleep(400);
    }

    return {
      candidates,
      meta: {
        totalFound: tupleElements.length,
        limitApplied: limit,
        pageUrl: window.location.href,
        capturedAt: new Date().toISOString()
      }
    };
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

  async function waitForSearchResults(timeout = 20000) {
    const start = Date.now();
    const resultSelectors = [
      '.resultTuple',
      '.tuple',
      '.candidateTuple',
      '.candTuple',
      '.candidate-card',
      '#resume-list-container',
      '.search-results',
      '.tuples-wrap',
      '[data-testid="candidate-list"]'
    ];

    while (Date.now() - start < timeout) {
      const hasResults = resultSelectors.some((selector) =>
        document.querySelector(selector)
      );
      if (hasResults) {
        return true;
      }
      await sleep(500);
    }

    throw new Error('Search results not detected yet');
  }

  async function executeNaukriSearch(criteria) {
    console.log('[agentv] Starting Naukri search automation...', criteria);

    if (!criteria || !criteria.keywords) {
      throw new Error('Keywords are required for Naukri search automation');
    }

    const isSearchPage =
      window.location.href.includes('resdex.naukri.com') ||
      !!document.querySelector('#adv-search-btn');

    if (!isSearchPage) {
      throw new Error(
        'Please open the Naukri Resdex advanced search page first (look for the "Search candidates" form).'
      );
    }

    // Give page some time to settle
    await sleep(1000);

    const searchButton = await waitForElement('#adv-search-btn', 15000);

    await fillSuggestorInput('input[name="ezKeywordsAny"]', criteria.keywords);

    const locationValue =
      typeof criteria.location === 'string'
        ? criteria.location
        : Array.isArray(criteria.location)
        ? criteria.location.join(', ')
        : '';
    await fillSuggestorInput('input[name="locations"]', locationValue);

    const minExp =
      criteria?.experience && criteria.experience.min !== undefined
        ? criteria.experience.min
        : '';
    const maxExp =
      criteria?.experience && criteria.experience.max !== undefined
        ? criteria.experience.max
        : '';

    await setSimpleInputValue('input[name="minExp"]', minExp);
    await setSimpleInputValue('input[name="maxExp"]', maxExp);

    await clickElement(searchButton);

    try {
      await waitForSearchResults(20000);
      console.log('[agentv] Search results detected');
    } catch (resultsError) {
      console.warn(
        '[agentv] Search results confirmation timed out:',
        resultsError
      );
    }

    return {
      success: true,
      message: 'Search submitted. Review the updated results on this page.'
    };
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

    if (request.action === 'executeNaukriSearch') {
      executeNaukriSearch(request.criteria)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          console.error('[agentv] Search automation error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === 'collectNaukriCandidates') {
      collectNaukriCandidates(request.criteria)
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          console.error('[agentv] Candidate collection error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });

  // Export for direct use
  window.agentvAutomation = {
    downloadCandidates,
    executeNaukriSearch,
    collectNaukriCandidates
  };
})();
