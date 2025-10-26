// Background Service Worker - Tracks time even when popup is closed

let currentTab = null;
let currentDomain = null;
let startTime = null;
let sessionData = {}; // Store time data in memory for now

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabTime installed!');
  startTracking();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('TabTime started!');
  startTracking();
});

// Start tracking the current active tab
async function startTracking() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    handleTabChange(tab);
  }
}

// Listen for tab activation (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTabChange(tab);
});

// Listen for tab updates (URL changes in same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    handleTabChange(tab);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - stop tracking
    saveCurrentSession();
    currentDomain = null;
    startTime = null;
  } else {
    // Browser gained focus - resume tracking
    startTracking();
  }
});

// Handle tab change
function handleTabChange(tab) {
  // Save time for previous tab
  saveCurrentSession();
  
  // Start tracking new tab
  currentTab = tab;
  currentDomain = extractDomain(tab.url);
  startTime = Date.now();
  
  console.log('Now tracking:', currentDomain);
}

// Save current session time
function saveCurrentSession() {
  if (!currentDomain || !startTime) return;
  
  const now = Date.now();
  const timeSpent = Math.floor((now - startTime) / 1000); // seconds
  
  if (timeSpent > 0) {
    if (!sessionData[currentDomain]) {
      sessionData[currentDomain] = 0;
    }
    sessionData[currentDomain] += timeSpent;
    
    console.log(`Saved ${timeSpent}s for ${currentDomain}. Total: ${sessionData[currentDomain]}s`);
  }
  
  // Reset start time to now for continuous tracking
  startTime = now;
}

// Extract domain from URL
function extractDomain(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return null; // Don't track Chrome pages
    }
    
    const urlObj = new URL(url);
    let domain = urlObj.hostname.replace(/^www\./, '');
    return domain;
  } catch {
    return null;
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_TIME') {
    const domain = request.domain;
    let timeSpent = sessionData[domain] || 0;
    
    // If this domain is currently being tracked, add current session time
    if (domain === currentDomain && startTime) {
      const now = Date.now();
      const currentSessionTime = Math.floor((now - startTime) / 1000);
      timeSpent += currentSessionTime;
    }
    
    sendResponse({ 
      time: timeSpent,
      isActive: domain === currentDomain 
    });
  }
  
  return true; // Keep message channel open
});

