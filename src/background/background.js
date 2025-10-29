// Background Service Worker - Tracks time even when popup is closed

let currentTab = null;
let currentDomain = null;
let startTime = null;
let sessionData = {}; // Store time data organized by date
let timeLimits = {}; // Store time limits for domains (in minutes)

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
    const result = await chrome.storage.local.get(['sessionData', 'timeLimits']);
    if (result.sessionData) {
      sessionData = result.sessionData;
      console.log('Loaded data from storage:', sessionData);
    }
    if (result.timeLimits) {
      timeLimits = result.timeLimits;
      console.log('Loaded limits from storage:', timeLimits);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to chrome.storage
async function saveDataToStorage() {
  try {
    await chrome.storage.local.set({ sessionData, timeLimits });
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
    const now = Date.now();
    const timeSpent = Math.floor((now - startTime) / 1000);
    
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
      
      // Add the time spent since last save
      sessionData[today][currentDomain] += timeSpent;
      
      console.log(`Periodic save: ${timeSpent}s for ${currentDomain}. Total: ${sessionData[today][currentDomain]}s`);
      
      // Save to storage
      await saveDataToStorage();
      
      // Reset startTime to now for next interval
      startTime = now;
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

// Sync browsing history
async function syncBrowsingHistory(days = 7) {
  console.log(`Starting history sync for last ${days} days...`);
  
  const now = Date.now();
  const startTime = now - (days * 24 * 60 * 60 * 1000); // X days ago
  
  try {
    // Get all history items from the last X days
    const historyItems = await chrome.history.search({
      text: '',
      startTime: startTime,
      endTime: now,
      maxResults: 10000
    });
    
    console.log(`Found ${historyItems.length} history items`);
    
    // Group visits by domain and date
    const visitsByDomain = {};
    
    // Get detailed visits for each history item
    for (const item of historyItems) {
      if (!item.url) continue;
      
      const domain = extractDomain(item.url);
      if (!domain) continue;
      
      // Get all visits for this URL
      const visits = await chrome.history.getVisits({ url: item.url });
      
      for (const visit of visits) {
        if (visit.visitTime < startTime) continue;
        
        const visitDate = new Date(visit.visitTime);
        const dateKey = visitDate.toISOString().split('T')[0];
        
        if (!visitsByDomain[dateKey]) {
          visitsByDomain[dateKey] = {};
        }
        
        if (!visitsByDomain[dateKey][domain]) {
          visitsByDomain[dateKey][domain] = [];
        }
        
        visitsByDomain[dateKey][domain].push({
          time: visit.visitTime,
          transition: visit.transition
        });
      }
    }
    
    console.log('Organized visits by domain and date');
    
    // Estimate time spent on each domain per day
    let totalImported = 0;
    
    for (const dateKey in visitsByDomain) {
      if (!sessionData[dateKey]) {
        sessionData[dateKey] = {};
      }
      
      for (const domain in visitsByDomain[dateKey]) {
        const visits = visitsByDomain[dateKey][domain];
        
        // Sort visits by time
        visits.sort((a, b) => a.time - b.time);
        
        let estimatedTime = 0;
        
        // Estimate time between consecutive visits
        for (let i = 0; i < visits.length - 1; i++) {
          const currentVisit = visits[i];
          const nextVisit = visits[i + 1];
          const gap = (nextVisit.time - currentVisit.time) / 1000; // seconds
          
          // Only count gaps less than 30 minutes (assume user was active)
          if (gap < 1800) {
            estimatedTime += gap;
          } else {
            // For gaps > 30 min, assume 5 minutes of activity
            estimatedTime += 300;
          }
        }
        
        // Add 5 minutes for the last visit (assumption)
        if (visits.length > 0) {
          estimatedTime += 300;
        }
        
        // Only import if we don't already have tracked data for this domain on this day
        if (!sessionData[dateKey][domain]) {
          sessionData[dateKey][domain] = Math.floor(estimatedTime);
          totalImported += Math.floor(estimatedTime);
        }
      }
    }
    
    // Save the imported data
    await saveDataToStorage();
    
    console.log(`History sync complete! Imported ${totalImported} seconds of estimated data`);
    
    return {
      success: true,
      itemsProcessed: historyItems.length,
      timeImported: totalImported,
      daysImported: days
    };
    
  } catch (error) {
    console.error('Error syncing history:', error);
    return {
      success: false,
      error: error.message
    };
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
  
  if (request.action === 'GET_HISTORY') {
    const history = [];
    const today = new Date();
    
    // Get last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayData = sessionData[dateKey] || {};
      let totalTime = 0;
      const sites = [];
      
      for (const domain in dayData) {
        const time = dayData[domain];
        totalTime += time;
        sites.push({ domain, time });
      }
      
      // Sort sites by time
      sites.sort((a, b) => b.time - a.time);
      
      history.push({
        date: dateKey,
        totalTime,
        sitesCount: sites.length,
        sites: sites.slice(0, 5) // Top 5 sites per day
      });
    }
    
    sendResponse({ history });
  }
  
  if (request.action === 'SYNC_HISTORY') {
    const days = request.days || 7;
    syncBrowsingHistory(days).then(result => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'GET_LIMITS') {
    sendResponse({ limits: timeLimits });
  }
  
  if (request.action === 'SET_LIMIT') {
    const { domain, limitMinutes } = request;
    timeLimits[domain] = limitMinutes;
    saveDataToStorage();
    sendResponse({ success: true });
  }
  
  if (request.action === 'DELETE_LIMIT') {
    const { domain } = request;
    delete timeLimits[domain];
    saveDataToStorage();
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open
});

