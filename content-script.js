// Content script for Naukri session capture
// This script runs on Naukri.com pages and captures session data

(function () {
  'use strict';

  console.log('[agentv] Content script loaded');

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureSession') {
      captureSessionData()
        .then((sessionData) => {
          sendResponse({ success: true, data: sessionData });
        })
        .catch((error) => {
          console.error('[agentv] Error capturing session:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (request.action === 'getStorage') {
      // Return localStorage and sessionStorage for background script
      try {
        const localStorage = {};
        const sessionStorage = {};

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            localStorage[key] = window.localStorage.getItem(key);
          }
        }

        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key);
          }
        }

        const userInfo = extractUserInfo();

        sendResponse({
          success: true,
          localStorage,
          sessionStorage,
          userInfo
        });
      } catch (error) {
        console.error('[agentv] Error getting storage:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'checkLoginStatus') {
      checkLoginStatus()
        .then((isLoggedIn) => {
          sendResponse({ success: true, isLoggedIn });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });

  // Function to capture session data
  async function captureSessionData() {
    try {
      const sessionData = {
        url: window.location.href,
        domain: window.location.hostname,
        timestamp: new Date().toISOString(),
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        userAgent: navigator.userAgent
      };

      // Capture cookies for the current domain and parent domain
      const domains = [
        window.location.hostname,
        '.naukri.com',
        '.naukrigulf.com',
        'resdex.naukri.com'
      ];

      for (const domain of domains) {
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

      // Capture localStorage (only for naukri.com domains)
      if (
        window.location.hostname.includes('naukri.com') ||
        window.location.hostname.includes('naukrigulf.com')
      ) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              sessionData.localStorage[key] = localStorage.getItem(key);
            }
          }
        } catch (error) {
          console.warn('[agentv] Could not access localStorage:', error);
        }

        // Capture sessionStorage
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              sessionData.sessionStorage[key] = sessionStorage.getItem(key);
            }
          }
        } catch (error) {
          console.warn('[agentv] Could not access sessionStorage:', error);
        }
      }

      // Capture user identification if available
      try {
        const userInfo = extractUserInfo();
        sessionData.userInfo = userInfo;
      } catch (error) {
        console.warn('[agentv] Could not extract user info:', error);
      }

      return sessionData;
    } catch (error) {
      console.error('[agentv] Error in captureSessionData:', error);
      throw error;
    }
  }

  // Function to check if user is logged in
  async function checkLoginStatus() {
    try {
      // Check for common Naukri login indicators
      const loginIndicators = [
        document.querySelector('[data-testid="user-name"]'),
        document.querySelector('.user-name'),
        document.querySelector('#userName'),
        document.querySelector('.userInfo'),
        document.body.innerText.includes('Logout') ||
          document.body.innerText.includes('Sign Out'),
        document.cookie.includes('NID') ||
          document.cookie.includes('JSESSIONID')
      ];

      const isLoggedIn = loginIndicators.some(
        (indicator) => indicator !== null
      );

      // Also check for employer portal specific indicators
      const employerIndicators = [
        window.location.href.includes('/recruiter/'),
        window.location.href.includes('/employer/'),
        document.body.innerText.includes('Post Job') ||
          document.body.innerText.includes('Search Candidates')
      ];

      return isLoggedIn || employerIndicators.some((ind) => ind);
    } catch (error) {
      console.error('[agentv] Error checking login status:', error);
      return false;
    }
  }

  // Function to extract user information from the page
  function extractUserInfo() {
    const userInfo = {};

    try {
      // Try to extract user name
      const nameSelectors = [
        '[data-testid="user-name"]',
        '.user-name',
        '#userName',
        '.userInfo .name'
      ];

      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          userInfo.name = element.textContent?.trim();
          break;
        }
      }

      // Try to extract email
      const emailFromCookies = document.cookie.match(/email=([^;]+)/);
      if (emailFromCookies) {
        userInfo.email = decodeURIComponent(emailFromCookies[1]);
      }

      // Check if we're on employer portal
      userInfo.isEmployerPortal =
        window.location.href.includes('/recruiter/') ||
        window.location.href.includes('/employer/');
    } catch (error) {
      console.warn('[agentv] Error extracting user info:', error);
    }

    return userInfo;
  }

  // Notify background script when page is loaded
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    url: window.location.href,
    domain: window.location.hostname
  });
})();
