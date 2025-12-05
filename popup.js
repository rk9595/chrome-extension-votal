// Popup script for agentv - Naukri Automation

document.addEventListener('DOMContentLoaded', () => {
  const checkLoginBtn = document.getElementById('checkLoginBtn');
  const openNaukriBtn = document.getElementById('openNaukriBtn');
  const statusMessage = document.getElementById('statusMessage');
  const apiEndpoint = document.getElementById('apiEndpoint');
  const orgId = document.getElementById('orgId');
  const mainContent = document.getElementById('mainContent');
  const downloadCandidatesBtn = document.getElementById(
    'downloadCandidatesBtn'
  );
  const downloadCandidatesBtnText = document.getElementById(
    'downloadCandidatesBtnText'
  );
  const jobTitle = document.getElementById('jobTitle');

  // Function to update button state - needs API endpoint for webhook
  function updateTaskButtons() {
    const hasOrgId = orgId && orgId.value.trim() !== '';
    const hasEndpoint = apiEndpoint && apiEndpoint.value.trim() !== '';
    if (downloadCandidatesBtn) {
      downloadCandidatesBtn.disabled = !hasOrgId || !hasEndpoint;
    }
  }

  // Load saved settings
  chrome.storage.local.get(['apiEndpoint', 'orgId'], (result) => {
    if (result.apiEndpoint) {
      apiEndpoint.value = result.apiEndpoint;
    }
    if (result.orgId) {
      orgId.value = result.orgId;
    }
    updateTaskButtons();
  });

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

      // Get base URL for webhook
      let baseUrl = apiEndpoint.value.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      if (baseUrl.includes('/api/')) {
        baseUrl = baseUrl.split('/api/')[0];
      }

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
