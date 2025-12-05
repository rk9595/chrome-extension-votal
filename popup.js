// Popup script for agentv - Naukri Automation

document.addEventListener('DOMContentLoaded', () => {
  const checkLoginBtn = document.getElementById('checkLoginBtn');
  const openNaukriBtn = document.getElementById('openNaukriBtn');
  const statusMessage = document.getElementById('statusMessage');
  const apiEndpoint = document.getElementById('apiEndpoint');
  const orgId = document.getElementById('orgId');
  const downloadCandidatesBtn = document.getElementById(
    'downloadCandidatesBtn'
  );
  const downloadCandidatesBtnText = document.getElementById(
    'downloadCandidatesBtnText'
  );
  const jobTitle = document.getElementById('jobTitle');
  const interviewId = document.getElementById('interviewId');
  const jobIdInput = document.getElementById('jobId');
  const searchApiEndpoint = document.getElementById('searchApiEndpoint');
  const searchKeywords = document.getElementById('searchKeywords');
  const searchLocation = document.getElementById('searchLocation');
  const searchMinExperience = document.getElementById('searchMinExperience');
  const searchMaxExperience = document.getElementById('searchMaxExperience');
  const numberOfCandidatesInput = document.getElementById('numberOfCandidates');
  const runNaukriSearchBtn = document.getElementById('runNaukriSearchBtn');
  const runNaukriSearchBtnText = document.getElementById(
    'runNaukriSearchBtnText'
  );
  const sendCandidatesBtn = document.getElementById('sendCandidatesBtn');
  const sendCandidatesBtnText = document.getElementById(
    'sendCandidatesBtnText'
  );

  // Function to update button state - needs API endpoint for webhook
  function updateTaskButtons() {
    const hasOrgId = orgId && orgId.value.trim() !== '';
    const hasEndpoint = apiEndpoint && apiEndpoint.value.trim() !== '';
    const hasKeywords =
      searchKeywords && searchKeywords.value.trim().length > 0;
    const hasInterview = interviewId && interviewId.value.trim().length > 0;
    const hasSearchEndpoint =
      searchApiEndpoint && searchApiEndpoint.value.trim().length > 0;

    if (downloadCandidatesBtn) {
      downloadCandidatesBtn.disabled = !hasOrgId || !hasEndpoint;
    }
    if (runNaukriSearchBtn) {
      runNaukriSearchBtn.disabled = !hasOrgId || !hasKeywords;
    }
    if (sendCandidatesBtn) {
      sendCandidatesBtn.disabled =
        !hasOrgId || !hasKeywords || !hasSearchEndpoint || !hasInterview;
    }
  }

  function getBaseApiUrl(inputElement = apiEndpoint) {
    if (!inputElement || !inputElement.value.trim()) {
      return '';
    }
    let baseUrl = inputElement.value.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (baseUrl.includes('/api/')) {
      baseUrl = baseUrl.split('/api/')[0];
    }
    return baseUrl;
  }

  // Load saved settings
  chrome.storage.local.get(
    [
      'apiEndpoint',
      'orgId',
      'interviewId',
      'jobId',
      'searchApiEndpoint',
      'searchKeywords',
      'searchLocation',
      'searchMinExperience',
      'searchMaxExperience',
      'numberOfCandidates'
    ],
    (result) => {
      if (result.apiEndpoint) {
        apiEndpoint.value = result.apiEndpoint;
      }
      if (result.orgId) {
        orgId.value = result.orgId;
      }
      if (interviewId && result.interviewId) {
        interviewId.value = result.interviewId;
      }
      if (jobIdInput && result.jobId) {
        jobIdInput.value = result.jobId;
      }
      if (searchApiEndpoint && result.searchApiEndpoint) {
        searchApiEndpoint.value = result.searchApiEndpoint;
      }
      if (searchKeywords && result.searchKeywords) {
        searchKeywords.value = result.searchKeywords;
      }
      if (searchLocation && result.searchLocation) {
        searchLocation.value = result.searchLocation;
      }
      if (searchMinExperience && result.searchMinExperience !== undefined) {
        searchMinExperience.value = result.searchMinExperience;
      }
      if (searchMaxExperience && result.searchMaxExperience !== undefined) {
        searchMaxExperience.value = result.searchMaxExperience;
      }
      if (
        numberOfCandidatesInput &&
        result.numberOfCandidates !== undefined &&
        result.numberOfCandidates !== null
      ) {
        numberOfCandidatesInput.value = result.numberOfCandidates;
      } else if (numberOfCandidatesInput) {
        numberOfCandidatesInput.value = '20';
      }
      updateTaskButtons();
    }
  );

  // Save settings on change and update button state on input
  apiEndpoint.addEventListener('input', () => {
    updateTaskButtons();
  });

  apiEndpoint.addEventListener('change', () => {
    chrome.storage.local.set({ apiEndpoint: apiEndpoint.value });
    updateTaskButtons();
  });

  orgId.addEventListener('input', () => {
    updateTaskButtons();
  });

  orgId.addEventListener('change', () => {
    chrome.storage.local.set({ orgId: orgId.value });
    updateTaskButtons();
  });

  if (interviewId) {
    interviewId.addEventListener('input', () => {
      updateTaskButtons();
    });
    interviewId.addEventListener('change', () => {
      chrome.storage.local.set({ interviewId: interviewId.value });
    });
  }

  if (jobIdInput) {
    jobIdInput.addEventListener('change', () => {
      chrome.storage.local.set({ jobId: jobIdInput.value });
    });
  }

  if (searchApiEndpoint) {
    searchApiEndpoint.addEventListener('input', () => {
      updateTaskButtons();
    });
    searchApiEndpoint.addEventListener('change', () => {
      chrome.storage.local.set({
        searchApiEndpoint: searchApiEndpoint.value
      });
    });
  }

  if (searchKeywords) {
    searchKeywords.addEventListener('input', () => {
      updateTaskButtons();
    });
    searchKeywords.addEventListener('change', () => {
      chrome.storage.local.set({ searchKeywords: searchKeywords.value });
    });
  }

  if (searchLocation) {
    searchLocation.addEventListener('change', () => {
      chrome.storage.local.set({ searchLocation: searchLocation.value });
    });
  }

  if (searchMinExperience) {
    searchMinExperience.addEventListener('change', () => {
      chrome.storage.local.set({
        searchMinExperience: searchMinExperience.value
      });
    });
  }

  if (searchMaxExperience) {
    searchMaxExperience.addEventListener('change', () => {
      chrome.storage.local.set({
        searchMaxExperience: searchMaxExperience.value
      });
    });
  }

  if (numberOfCandidatesInput) {
    numberOfCandidatesInput.addEventListener('change', () => {
      chrome.storage.local.set({
        numberOfCandidates: numberOfCandidatesInput.value
      });
    });
  }

  // Check if on correct page
  checkLoginBtn.addEventListener('click', async () => {
    showStatus('Checking page...', 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        if (tabs[0].url.includes('/applies')) {
          showStatus(
            "✅ Perfect! You're on the applications page. Ready to automate!",
            'success'
          );
        } else if (
          tabs[0].url.includes('naukri.com') ||
          tabs[0].url.includes('naukrigulf.com')
        ) {
          showStatus(
            '⚠️ Please navigate to a job applications page (URL should contain "/applies")',
            'warning'
          );
        } else {
          showStatus(
            '⚠️ Please open Naukri.com and navigate to a job applications page first.',
            'warning'
          );
        }
      } else {
        showStatus('⚠️ Please open a Naukri.com page first.', 'warning');
      }
    });
  });

  // Open Naukri.com job listing page (user can navigate to applications from there)
  openNaukriBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://hiring.naukri.com/hiring/job-listing' });
    showStatus(
      'ℹ️ Navigate to a job applications page (click on a job, then "Total Responses")',
      'info'
    );
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.classList.remove('hidden');

    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 5000);
    }
  }

  function parseExperienceValue(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getCandidateCaptureLimit() {
    if (!numberOfCandidatesInput) {
      return 20;
    }
    const parsed = Number(numberOfCandidatesInput.value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 20;
    }
    return Math.min(Math.max(Math.round(parsed), 1), 40);
  }

  // Download Candidates button
  if (downloadCandidatesBtn) {
    downloadCandidatesBtn.addEventListener('click', async () => {
      if (!orgId.value.trim()) {
        showStatus('Please enter Organization ID first', 'error');
        return;
      }

      if (!apiEndpoint.value.trim()) {
        showStatus('Please enter API endpoint first', 'error');
        return;
      }

      const jobTitleValue = jobTitle.value.trim() || 'Unknown Job';

      const baseUrl = getBaseApiUrl();

      showStatus('Starting automation in your browser...', 'info');
      downloadCandidatesBtn.disabled = true;
      downloadCandidatesBtnText.innerHTML =
        '<span class="loading"></span> Starting automation...';

      try {
        // Get current active tab
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        // Verify we're on an applications page
        if (!activeTab.url || !activeTab.url.includes('/applies')) {
          throw new Error(
            'Please navigate to a job applications page first (URL should contain "/applies"). Click on a job, then click "Total Responses".'
          );
        }

        const targetTab = activeTab;
        console.log(
          '[agentv] Using current tab (applications page):',
          targetTab.url
        );

        // Inject automation script if not already loaded
        console.log(
          '[agentv] Injecting automation script into tab:',
          targetTab.id
        );
        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            files: ['automation.js']
          });
          console.log('[agentv] Automation script injected successfully');
        } catch (injectError) {
          console.error('[agentv] Error injecting script:', injectError);
          // Script might already be loaded, continue anyway
        }

        // Wait a bit for script to load
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Trigger automation
        showStatus('Running automation...', 'info');
        downloadCandidatesBtnText.innerHTML =
          '<span class="loading"></span> Running automation...';

        console.log(
          '[agentv] Sending downloadCandidates message with jobTitle:',
          jobTitleValue
        );
        console.log('[agentv] Target tab URL:', targetTab.url);

        const response = await chrome.tabs.sendMessage(targetTab.id, {
          action: 'downloadCandidates',
          jobTitle: jobTitleValue
        });

        console.log('[agentv] Received response from automation:', response);

        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        if (!response || !response.success) {
          throw new Error(response?.error || 'Automation failed');
        }

        // Check if we have download data
        if (response.data && response.data.downloadBlob) {
          showStatus('📤 Uploading file to server...', 'info');
          downloadCandidatesBtnText.innerHTML =
            '<span class="loading"></span> Uploading...';

          try {
            const downloadData = response.data.downloadBlob;

            // Convert base64 back to blob
            const binaryString = atob(downloadData.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Send to webhook
            const formData = new FormData();
            const blob = new Blob([bytes], { type: downloadData.mimeType });
            formData.append('file', blob, downloadData.fileName);
            formData.append('orgId', orgId.value.trim());
            formData.append('jobTitle', jobTitleValue);
            formData.append('fileSize', String(downloadData.fileSize));
            formData.append('mimeType', downloadData.mimeType);
            formData.append('timestamp', new Date().toISOString());
            // Note: contextId and sessionId are not available in direct browser automation
            // You may want to make these optional in your webhook handler

            const webhookUrl = `${baseUrl}/api/webhook/chrome-extension/naukri/csv-receiver`;
            console.log('[agentv] Sending to webhook:', webhookUrl);

            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              body: formData
              // Don't set Content-Type header - let browser set it with boundary
            });

            if (!webhookResponse.ok) {
              const errorText = await webhookResponse.text();
              throw new Error(
                `Webhook error: ${webhookResponse.status} - ${errorText}`
              );
            }

            const webhookResult = await webhookResponse.json();
            console.log('[agentv] Webhook response:', webhookResult);

            showStatus(
              '✅ File uploaded successfully! Check your dashboard.',
              'success'
            );
          } catch (error) {
            console.error('[agentv] Error uploading to webhook:', error);
            showStatus(`Upload failed: ${error.message}`, 'error');
          } finally {
            downloadCandidatesBtn.disabled = false;
            downloadCandidatesBtnText.textContent = '📥 Download Candidates';
          }
        } else {
          showStatus('✅ Automation completed! (No file captured)', 'success');
          downloadCandidatesBtn.disabled = false;
          downloadCandidatesBtnText.textContent = '📥 Download Candidates';
        }
      } catch (error) {
        console.error('[agentv] Automation error:', error);
        console.error('[agentv] Error stack:', error.stack);
        showStatus(`Error: ${error.message}`, 'error');

        // Show debugging info
        console.log('[agentv] Debug info:', {
          error: error.message,
          jobTitle: jobTitleValue,
          orgId: orgId.value.trim(),
          apiEndpoint: apiEndpoint.value.trim()
        });
      } finally {
        downloadCandidatesBtn.disabled = false;
        downloadCandidatesBtnText.textContent = '📥 Download Candidates';
      }
    });
  }

  // Run Naukri Search automation
  if (runNaukriSearchBtn) {
    runNaukriSearchBtn.addEventListener('click', async () => {
      if (!orgId.value.trim()) {
        showStatus('Please enter Organization ID first', 'error');
        return;
      }

      if (!searchKeywords || !searchKeywords.value.trim()) {
        showStatus('Please enter at least one keyword', 'error');
        return;
      }

      const minExp = parseExperienceValue(
        searchMinExperience ? searchMinExperience.value : null
      );
      const maxExp = parseExperienceValue(
        searchMaxExperience ? searchMaxExperience.value : null
      );

      if (minExp !== null && maxExp !== null && minExp > maxExp) {
        showStatus(
          'Min experience cannot be greater than max experience',
          'error'
        );
        return;
      }

      const criteria = {
        jobTitle: jobTitle?.value.trim() || 'Candidate Search',
        keywords: searchKeywords.value.trim(),
        location: searchLocation?.value.trim() || '',
        experience: {
          min: minExp,
          max: maxExp
        },
        orgId: orgId.value.trim()
      };

      showStatus('Preparing search automation...', 'info');
      runNaukriSearchBtn.disabled = true;
      runNaukriSearchBtnText.innerHTML =
        '<span class="loading"></span> Running search...';

      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        if (!activeTab || !activeTab.id) {
          throw new Error('No active tab detected');
        }

        if (!activeTab.url || !activeTab.url.includes('resdex.naukri.com')) {
          throw new Error(
            'Please open the Naukri Resdex advanced search page first.'
          );
        }

        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['automation.js']
          });
        } catch (injectError) {
          console.warn(
            '[agentv] Search automation script inject warning:',
            injectError
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 800));

        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'executeNaukriSearch',
          criteria
        });

        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        if (!response || !response.success) {
          throw new Error(response?.error || 'Search automation failed');
        }

        showStatus(
          response.data?.message ||
            '✅ Search submitted. Review candidates on this tab.',
          'success'
        );
      } catch (error) {
        console.error('[agentv] Search automation error:', error);
        showStatus(`Search error: ${error.message}`, 'error');
      } finally {
        runNaukriSearchBtn.disabled = false;
        runNaukriSearchBtnText.textContent = '🔍 Run Naukri Search';
      }
    });
  }

  if (sendCandidatesBtn) {
    sendCandidatesBtn.addEventListener('click', async () => {
      if (!orgId.value.trim()) {
        showStatus('Please enter Organization ID first', 'error');
        return;
      }
      if (!searchApiEndpoint || !searchApiEndpoint.value.trim()) {
        showStatus('Please enter Search API endpoint first', 'error');
        return;
      }
      if (!interviewId || !interviewId.value.trim()) {
        showStatus('Please enter Interview ID', 'error');
        return;
      }
      if (!searchKeywords || !searchKeywords.value.trim()) {
        showStatus('Please enter at least one keyword', 'error');
        return;
      }

      const baseUrl = getBaseApiUrl(searchApiEndpoint);
      if (!baseUrl) {
        showStatus('Invalid API endpoint provided', 'error');
        return;
      }

      const minExp = parseExperienceValue(
        searchMinExperience ? searchMinExperience.value : null
      );
      const maxExp = parseExperienceValue(
        searchMaxExperience ? searchMaxExperience.value : null
      );

      if (minExp !== null && maxExp !== null && minExp > maxExp) {
        showStatus(
          'Min experience cannot be greater than max experience',
          'error'
        );
        return;
      }

      const limit = getCandidateCaptureLimit();
      const keywordsValue = searchKeywords.value.trim();
      const locationValue = searchLocation?.value.trim() || '';
      const jobTitleValue = jobTitle?.value.trim() || 'Candidate Search';
      const interviewIdValue = interviewId.value.trim();
      const jobIdValue = jobIdInput?.value.trim() || '';

      sendCandidatesBtn.disabled = true;
      sendCandidatesBtnText.innerHTML =
        '<span class="loading"></span> Collecting results...';
      showStatus('Collecting candidates from this page...', 'info');

      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        if (!activeTab || !activeTab.id) {
          throw new Error('No active tab detected');
        }

        if (!activeTab.url || !activeTab.url.includes('resdex.naukri.com')) {
          throw new Error(
            'Please open the Naukri Resdex advanced search results page first.'
          );
        }

        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['automation.js']
          });
        } catch (injectError) {
          console.warn(
            '[agentv] Candidate extraction script inject warning:',
            injectError
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 800));

        const extractionResponse = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'collectNaukriCandidates',
          criteria: {
            keywords: keywordsValue,
            location: locationValue,
            experience: { min: minExp, max: maxExp },
            limit,
            jobTitle: jobTitleValue
          }
        });

        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        if (!extractionResponse || !extractionResponse.success) {
          throw new Error(
            extractionResponse?.error ||
              'Candidate extraction failed. Ensure results are visible.'
          );
        }

        const candidates = Array.isArray(extractionResponse.data?.candidates)
          ? extractionResponse.data?.candidates
          : [];
        const extractionMeta = extractionResponse.data?.meta || {};

        if (candidates.length === 0) {
          throw new Error(
            'No candidates were captured. Scroll through the results and try again.'
          );
        }

        showStatus(
          `Captured ${candidates.length} candidates, sending to server...`,
          'info'
        );
        sendCandidatesBtnText.innerHTML =
          '<span class="loading"></span> Sending to server...';

        const webhookUrl = `${baseUrl}/api/webhook/browserbase/naukri-search/candidates-receiver`;
        const payload = {
          candidates,
          metadata: {
            orgId: orgId.value.trim(),
            jobTitle: jobTitleValue,
            location: locationValue,
            keywords: keywordsValue,
            experience: { min: minExp, max: maxExp },
            numberOfCandidatesRequested: limit,
            interviewIdReceived: interviewIdValue,
            jobId: jobIdValue || undefined,
            pageUrl: extractionMeta.pageUrl || activeTab.url,
            totalFound: extractionMeta.totalFound || candidates.length,
            capturedCount: candidates.length,
            capturedAt: new Date().toISOString(),
            source: 'chrome-extension-naukri-search'
          }
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          throw new Error(
            `Webhook error: ${webhookResponse.status} - ${errorText}`
          );
        }

        const webhookResult = await webhookResponse.json();
        console.log('[agentv] Candidates webhook response:', webhookResult);

        showStatus(
          `✅ Sent ${candidates.length} candidates to your server.`,
          'success'
        );
      } catch (error) {
        console.error('[agentv] Candidate sync error:', error);
        showStatus(`Candidate sync failed: ${error.message}`, 'error');
      } finally {
        sendCandidatesBtn.disabled = false;
        sendCandidatesBtnText.textContent = '📤 Send Candidates to Server';
      }
    });
  }

  // Initial check - verify user is on applications page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (
      tabs[0] &&
      tabs[0].url &&
      (tabs[0].url.includes('naukri.com') ||
        tabs[0].url.includes('naukrigulf.com'))
    ) {
      if (tabs[0].url.includes('/applies')) {
        showStatus("✅ Ready! You're on the applications page.", 'success');
      } else {
        showStatus(
          'ℹ️ Navigate to the job applications page (URL should contain "/applies") to start automation.',
          'info'
        );
      }
    } else {
      showStatus(
        'ℹ️ Open Naukri.com and navigate to a job applications page to start automation.',
        'info'
      );
    }
    updateTaskButtons();
  });
});
