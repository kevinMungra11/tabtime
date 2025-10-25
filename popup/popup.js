// Popup logic - UI layer only
// This will communicate with background script via messages

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentSiteInfo();
  await loadTodayStats();
  
  setupEventListeners();
});

async function loadCurrentSiteInfo() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      const domain = extractDomain(tab.url);
      
      // Request time data from background script
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SITE_TIME',
        domain: domain
      });
      
      displayCurrentSite(domain, response?.time || 0);
    }
  } catch (error) {
    console.error('Error loading current site:', error);
    document.getElementById('currentSiteInfo').innerHTML = 
      '<p class="loading">Unable to load</p>';
  }
}

async function loadTodayStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_TODAY_STATS'
    });
    
    displayTodayStats(response);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function displayCurrentSite(domain, timeInSeconds) {
  const container = document.getElementById('currentSiteInfo');
  const formattedTime = formatTime(timeInSeconds);
  
  container.innerHTML = `
    <p class="domain">${domain}</p>
    <p class="time">Time spent: ${formattedTime}</p>
  `;
}

function displayTodayStats(stats) {
  const container = document.getElementById('todayStats');
  const totalTime = formatTime(stats?.totalTime || 0);
  const sitesCount = stats?.sitesCount || 0;
  
  container.innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${totalTime}</span>
      <span class="stat-label">Total Time</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${sitesCount}</span>
      <span class="stat-label">Sites Visited</span>
    </div>
  `;
}

function setupEventListeners() {
  document.getElementById('viewAnalytics').addEventListener('click', () => {
    // Will open analytics page
    chrome.tabs.create({ url: 'analytics/analytics.html' });
  });
  
  document.getElementById('setLimit').addEventListener('click', () => {
    // Will open limit setting page
    chrome.tabs.create({ url: 'limits/limits.html' });
  });
}

// Utility functions
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

