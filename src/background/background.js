// Background Service Worker - Tracks time even when popup is closed

let currentTab = null;
let currentDomain = null;
let startTime = null;
let sessionData = {}; // Store time data organized by date
let timeLimits = {}; // Store time limits for domains (in minutes)
let notificationState = {}; // Track which notifications have been shown today
let isPaused = false; // Pause/resume tracking state
let isIdle = false; // Idle detection state
let whitelist = []; // Websites to never track
let emergencyOverrides = {}; // Emergency override state by domain (resets daily)

// Helper to get today's date key (YYYY-MM-DD)
function getTodayKey() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Initialize immediately when service worker starts (handles reload in dev mode)
(async function init() {
  console.log('TabTime service worker initialized');
  await loadDataFromStorage();
  startTracking();
})();

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
    const result = await chrome.storage.local.get(['sessionData', 'timeLimits', 'notificationState', 'isPaused', 'whitelist', 'emergencyOverrides']);
    if (result.sessionData) {
      sessionData = result.sessionData;
      console.log('Loaded data from storage:', sessionData);
    }
    if (result.timeLimits) {
      timeLimits = result.timeLimits;
      console.log('Loaded limits from storage:', timeLimits);
    }
    if (result.notificationState) {
      notificationState = result.notificationState;
      // Clean up old notification states (not from today)
      const today = getTodayKey();
      if (notificationState.date !== today) {
        notificationState = { date: today };
      }
    } else {
      notificationState = { date: getTodayKey() };
    }
    if (result.isPaused !== undefined) {
      isPaused = result.isPaused;
    }
    if (result.whitelist) {
      whitelist = result.whitelist;
    }
    if (result.emergencyOverrides) {
      emergencyOverrides = result.emergencyOverrides;
      // Clean up old overrides (not from today)
      const today = getTodayKey();
      if (emergencyOverrides.date !== today) {
        emergencyOverrides = { date: today };
      }
    } else {
      emergencyOverrides = { date: getTodayKey() };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to chrome.storage
async function saveDataToStorage() {
  try {
    await chrome.storage.local.set({ sessionData, timeLimits, notificationState, isPaused, whitelist, emergencyOverrides });
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

// Listen for navigation and block if limit exceeded
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  
  const domain = extractDomain(details.url);
  if (!domain || !timeLimits[domain]) return; // No limit set
  
  // Check emergency override
  const today = getTodayKey();
  if (emergencyOverrides.date === today && emergencyOverrides[domain]) {
    return; // Emergency override active
  }
  
  // Check if limit is exceeded
  const timeSpent = (sessionData[today] && sessionData[today][domain]) || 0;
  const limitSeconds = timeLimits[domain] * 60;
  
  if (timeSpent >= limitSeconds) {
    // Redirect to blocked page
    chrome.tabs.update(details.tabId, {
      url: `blocked.html?domain=${encodeURIComponent(domain)}`
    });
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

// Check time limits and send notifications
async function checkTimeLimits(domain, totalTimeSeconds) {
  if (!timeLimits[domain]) return; // No limit set for this domain
  
  const limitSeconds = timeLimits[domain] * 60;
  const percentUsed = (totalTimeSeconds / limitSeconds) * 100;
  
  const today = getTodayKey();
  
  // Ensure notification state has today's date
  if (notificationState.date !== today) {
    notificationState = { date: today };
  }
  
  // Initialize domain notification state
  if (!notificationState[domain]) {
    notificationState[domain] = {
      warning80: false,
      limitReached: false
    };
  }
  
  // 80% warning notification
  if (percentUsed >= 80 && percentUsed < 100 && !notificationState[domain].warning80) {
    const minutesUsed = Math.floor(totalTimeSeconds / 60);
    const limitMinutes = timeLimits[domain];
    
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '⏰ Time Limit Warning',
      message: `You've used ${minutesUsed} of ${limitMinutes} minutes on ${domain} today.`,
      priority: 1
    });
    
    notificationState[domain].warning80 = true;
    await saveDataToStorage();
    console.log(`Sent 80% warning for ${domain}`);
  }
  
  // 100% limit reached notification
  if (percentUsed >= 100 && !notificationState[domain].limitReached) {
    const limitMinutes = timeLimits[domain];
    
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '⚠️ Time Limit Reached!',
      message: `You've reached your ${limitMinutes} minute limit for ${domain} today.`,
      priority: 2
    });
    
    notificationState[domain].limitReached = true;
    await saveDataToStorage();
    console.log(`Sent limit reached notification for ${domain}`);
  }
}

// Periodic save every 30 seconds (backup)
setInterval(async () => {
  // Don't save if paused, idle, or whitelisted
  if (isPaused || isIdle || !currentDomain || !startTime || isWhitelisted(currentDomain)) {
    return;
  }
  
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
      
      // Check time limits and send notifications if needed
      await checkTimeLimits(currentDomain, sessionData[today][currentDomain]);
      
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
  
  // Start tracking new tab (only if not paused and not idle and not whitelisted)
  const domain = extractDomain(tab.url);
  
  if (isPaused || isIdle || isWhitelisted(domain)) {
    currentTab = tab;
    currentDomain = domain;
    startTime = null; // Don't track
    console.log('Tracking paused/whitelisted for:', domain);
    return;
  }
  
  currentTab = tab;
  currentDomain = domain;
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
    
    // Check time limits and send notifications if needed
    await checkTimeLimits(currentDomain, sessionData[today][currentDomain]);
    
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

// Check if domain is whitelisted
function isWhitelisted(domain) {
  return domain && whitelist.includes(domain);
}

// Idle detection - pause tracking when user is idle for 5+ minutes
chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === 'idle' && !isIdle) {
    isIdle = true;
    console.log('User is idle, pausing tracking');
    await saveCurrentSession(); // Save before pausing
  } else if (newState !== 'idle' && isIdle) {
    isIdle = false;
    console.log('User is active again, resuming tracking');
    // Resume tracking current tab
    if (!isPaused) {
      startTracking();
    }
  }
});

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
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
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
    const result = await syncBrowsingHistory(days);
    sendResponse(result);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'GET_LIMITS') {
    sendResponse({ limits: timeLimits });
  }
  
  if (request.action === 'SET_LIMIT') {
    const { domain, limitMinutes } = request;
    timeLimits[domain] = limitMinutes;
    await saveDataToStorage();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'DELETE_LIMIT') {
    const { domain } = request;
    delete timeLimits[domain];
    await saveDataToStorage();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'TOGGLE_PAUSE') {
    isPaused = !isPaused;
    if (isPaused) {
      await saveCurrentSession(); // Save before pausing
      startTime = null;
    } else {
      await startTracking(); // Resume tracking
    }
    await saveDataToStorage();
    sendResponse({ isPaused });
    return true;
  }
  
  if (request.action === 'GET_PAUSE_STATE') {
    sendResponse({ isPaused, isIdle });
  }
  
  if (request.action === 'GET_WHITELIST') {
    sendResponse({ whitelist });
  }
  
  if (request.action === 'ADD_TO_WHITELIST') {
    const { domain } = request;
    if (domain && !whitelist.includes(domain)) {
      whitelist.push(domain);
      await saveDataToStorage();
      // If currently tracking this domain, stop tracking
      if (currentDomain === domain) {
        await saveCurrentSession();
        startTime = null;
      }
    }
    sendResponse({ success: true, whitelist });
    return true;
  }
  
  if (request.action === 'REMOVE_FROM_WHITELIST') {
    const { domain } = request;
    whitelist = whitelist.filter(d => d !== domain);
    await saveDataToStorage();
    sendResponse({ success: true, whitelist });
    return true;
  }
  
  if (request.action === 'EMERGENCY_OVERRIDE') {
    const { domain } = request;
    const today = getTodayKey();
    if (emergencyOverrides.date !== today) {
      emergencyOverrides = { date: today };
    }
    emergencyOverrides[domain] = true;
    await saveDataToStorage();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'GET_WEEK_STATS') {
    const weekData = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = sessionData[dateKey] || {};
      let totalTime = 0;
      for (const domain in dayData) {
        totalTime += dayData[domain];
      }
      weekData.push({ date: dateKey, totalTime });
    }
    
    const weekTotal = weekData.reduce((sum, day) => sum + day.totalTime, 0);
    const weekAvg = Math.floor(weekTotal / 7);
    
    sendResponse({ weekData, weekTotal, weekAvg });
  }
  
  return true; // Keep message channel open
});

