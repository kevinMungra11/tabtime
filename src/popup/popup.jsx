import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

function App() {
  const [currentDomain, setCurrentDomain] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [todayStats, setTodayStats] = useState({ totalTime: 0, sitesCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentTabDomain();
    getTodayStats();
  }, []);

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
          sitesCount: response.sitesCount || 0
        });
      }
    } catch (error) {
      console.error('Error getting today stats:', error);
    }
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
              <div className="time-display">
                <p className="time-label">Time spent today</p>
                <p className="time-value">{formatTime(timeSpent)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

