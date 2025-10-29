import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

function App() {
  const [currentDomain, setCurrentDomain] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [todayStats, setTodayStats] = useState({ totalTime: 0, sitesCount: 0, sites: {} });
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState({});

  useEffect(() => {
    getCurrentTabDomain();
    getTodayStats();
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_LIMITS'
      });
      
      if (response && response.limits) {
        setLimits(response.limits);
      }
    } catch (error) {
      console.error('Error loading limits:', error);
    }
  };

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      if (currentDomain && currentDomain !== 'Chrome Page' && currentDomain !== 'Unknown' && currentDomain !== 'Error') {
        getTimeForDomain(currentDomain);
      }
      getTodayStats();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentDomain]);

  const getCurrentTabDomain = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url) {
        const domain = extractDomain(tab.url);
        setCurrentDomain(domain);
        
        // Get time for this domain
        if (domain !== 'Chrome Page' && domain !== 'Unknown') {
          await getTimeForDomain(domain);
        }
      } else {
        setCurrentDomain('Unknown');
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
      setCurrentDomain('Error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeForDomain = async (domain) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_TIME',
        domain: domain
      });
      
      if (response && response.time !== undefined) {
        setTimeSpent(response.time);
      }
    } catch (error) {
      console.error('Error getting time:', error);
    }
  };

  const getTodayStats = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_TODAY_STATS'
      });
      
      if (response) {
        setTodayStats({
          totalTime: response.totalTime || 0,
          sitesCount: response.sitesCount || 0,
          sites: response.sites || {}
        });
      }
    } catch (error) {
      console.error('Error getting today stats:', error);
    }
  };

  const getTopSites = () => {
    const sites = todayStats.sites || {};
    const siteArray = [];
    
    // Convert sites object to array
    for (const domain in sites) {
      siteArray.push({ 
        domain, 
        time: sites[domain] 
      });
    }
    
    // Sort by time (descending) and take top 10
    return siteArray
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);
  };

  const extractDomain = (url) => {
    try {
      // Handle special Chrome URLs
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        return 'Chrome Page';
      }
      
      const urlObj = new URL(url);
      let domain = urlObj.hostname;
      
      // Remove www. prefix
      domain = domain.replace(/^www\./, '');
      
      return domain;
    } catch {
      return 'Invalid URL';
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const topSites = getTopSites();
  
  // Check if current domain has a limit
  const currentLimit = limits[currentDomain];
  const limitSeconds = currentLimit ? currentLimit * 60 : null;
  const limitProgress = limitSeconds ? (timeSpent / limitSeconds) * 100 : 0;
  const isOverLimit = limitSeconds && timeSpent >= limitSeconds;
  const isNearLimit = limitSeconds && timeSpent >= limitSeconds * 0.8;

  return (
    <div className="container">
      <h1>TabTime</h1>
      
      <div className="today-stats">
        <h2>Today's Activity</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-value">{formatTime(todayStats.totalTime)}</p>
            <p className="stat-label">Total Time</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{todayStats.sitesCount}</p>
            <p className="stat-label">Sites Visited</p>
          </div>
        </div>
      </div>
      
      <div className="current-site">
        <h2>Current Site</h2>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <>
            <div className="domain-display">
              <p className="domain">{currentDomain}</p>
            </div>
            
            {currentDomain !== 'Chrome Page' && currentDomain !== 'Unknown' && currentDomain !== 'Error' && (
              <>
                <div className="time-display">
                  <p className="time-label">Time spent today</p>
                  <p className="time-value">{formatTime(timeSpent)}</p>
                  
                  {limitSeconds && (
                    <p className="limit-info">
                      / {formatTime(limitSeconds)} limit
                    </p>
                  )}
                </div>
                
                {limitSeconds && (
                  <div className="progress-container">
                    <div 
                      className={`progress-bar ${isOverLimit ? 'over-limit' : isNearLimit ? 'near-limit' : ''}`}
                      style={{ width: `${Math.min(limitProgress, 100)}%` }}
                    />
                  </div>
                )}
                
                {isOverLimit && (
                  <div className="limit-warning over">
                    ⚠️ Time limit exceeded!
                  </div>
                )}
                {isNearLimit && !isOverLimit && (
                  <div className="limit-warning near">
                    ⏰ Approaching time limit
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {topSites.length > 0 && (
        <div className="top-sites">
          <h2>Top Sites Today</h2>
          <div className="sites-list">
            {topSites.map((site, index) => (
              <div key={site.domain} className="site-item">
                <div className="site-rank">{index + 1}</div>
                <div className="site-info">
                  <p className="site-domain">{site.domain}</p>
                  <p className="site-time">{formatTime(site.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        <button 
          className="btn btn-secondary"
          onClick={() => chrome.tabs.create({ url: 'limits.html' })}
        >
          ⏰ Manage Limits
        </button>
        <button 
          className="btn btn-primary"
          onClick={() => chrome.tabs.create({ url: 'history.html' })}
        >
          📊 View History
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

