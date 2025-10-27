// Background Service Worker - Tracks time even when popup is closed

let currentTab = null;
let currentDomain = null;
let startTime = null;
let sessionData = {}; // Store time data organized by date

// Helper to get today's date key (YYYY-MM-DD)
function getTodayKey() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabTime installed!');
  await loadDataFromStorage();
  startTracking();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('TabTime started!');
  await loadDataFromStorage();
  startTracking();
});

// Load data from chrome.storage
async function loadDataFromStorage() {
  try {
    const result = await chrome.storage.local.get(['sessionData']);
    if (result.sessionData) {
      sessionData = result.sessionData;
      console.log('Loaded data from storage:', sessionData);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to chrome.storage
async function saveDataToStorage() {
  try {
    await chrome.storage.local.set({ sessionData });
    console.log('Saved data to storage');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

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
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - stop tracking
    await saveCurrentSession();
    currentDomain = null;
    startTime = null;
  } else {
    // Browser gained focus - resume tracking
    startTracking();
  }
});

// Periodic save every 30 seconds (backup)
setInterval(async () => {
  if (currentDomain && startTime) {
    // Save current session without resetting startTime
    const now = Date.now();
    const timeSpent = Math.floor((now - startTime) / 1000);
    
    if (timeSpent > 0) {
      const today = getTodayKey();
      const tempDomain = currentDomain;
      
      // Create a copy of sessionData
      const dataToSave = JSON.parse(JSON.stringify(sessionData));
      
      // Initialize today's data if not exists
      if (!dataToSave[today]) {
        dataToSave[today] = {};
      }
      
      // Initialize domain data if not exists
      if (!dataToSave[today][tempDomain]) {
        dataToSave[today][tempDomain] = 0;
      }
      
      // Calculate total including current session
      const totalTime = dataToSave[today][tempDomain] + timeSpent;
      dataToSave[today][tempDomain] = totalTime;
      
      // Save to storage
      await chrome.storage.local.set({ sessionData: dataToSave });
      console.log('Periodic save - preserving current session');
    }
  }
}, 30000); // Every 30 seconds

// Handle tab change
async function handleTabChange(tab) {
  // Save time for previous tab
  await saveCurrentSession();
  
  // Start tracking new tab
  currentTab = tab;
  currentDomain = extractDomain(tab.url);
  startTime = Date.now();
  
  console.log('Now tracking:', currentDomain);
}

// Save current session time
async function saveCurrentSession() {
  if (!currentDomain || !startTime) return;
  
  const now = Date.now();
  const timeSpent = Math.floor((now - startTime) / 1000); // seconds
  
  if (timeSpent > 0) {
    const today = getTodayKey();
    
    // Initialize today's data if not exists
    if (!sessionData[today]) {
      sessionData[today] = {};
    }
    
    // Initialize domain data if not exists
    if (!sessionData[today][currentDomain]) {
      sessionData[today][currentDomain] = 0;
    }
    
    sessionData[today][currentDomain] += timeSpent;
    
    console.log(`Saved ${timeSpent}s for ${currentDomain}. Total: ${sessionData[today][currentDomain]}s`);
    
    // Persist to storage
    await saveDataToStorage();
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
    const today = getTodayKey();
    let timeSpent = (sessionData[today] && sessionData[today][domain]) || 0;
    
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
  
  if (request.action === 'GET_TODAY_STATS') {
    const today = getTodayKey();
    const todayData = sessionData[today] || {};
    
    let totalTime = 0;
    let sitesCount = 0;
    
    // Calculate total from saved data
    for (const domain in todayData) {
      totalTime += todayData[domain];
      sitesCount++;
    }
    
    // Add current session if tracking
    if (currentDomain && startTime) {
      const now = Date.now();
      const currentSessionTime = Math.floor((now - startTime) / 1000);
      
      if (!todayData[currentDomain]) {
        sitesCount++;
      }
      totalTime += currentSessionTime;
    }
    
    sendResponse({
      totalTime,
      sitesCount,
      sites: todayData
    });
  }
  
  return true; // Keep message channel open
});

