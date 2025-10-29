import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './blocked.css';

function Blocked() {
  const [domain, setDomain] = useState('');
  const [limit, setLimit] = useState(0);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  useEffect(() => {
    // Get domain from URL parameter
    const params = new URLSearchParams(window.location.search);
    const blockedDomain = params.get('domain');
    setDomain(blockedDomain || 'this website');

    // Get limit info
    loadLimitInfo(blockedDomain);

    // Calculate time until midnight
    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadLimitInfo = async (domain) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_LIMITS'
      });

      if (response && response.limits && response.limits[domain]) {
        setLimit(response.limits[domain]);
      }
    } catch (error) {
      console.error('Error loading limit:', error);
    }
  };

  const updateTimeUntilReset = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const diff = midnight - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
  };

  const openLimitsPage = () => {
    chrome.tabs.create({ url: 'limits.html' });
  };

  const openHistoryPage = () => {
    chrome.tabs.create({ url: 'history.html' });
  };

  return (
    <div className="blocked-container">
      <div className="blocked-content">
        <div className="icon">⏱️</div>
        <h1>Time's Up!</h1>
        <p className="subtitle">
          You've reached your daily limit for <strong>{domain}</strong>
        </p>

        {limit > 0 && (
          <div className="limit-info-box">
            <p>Daily Limit: <strong>{limit} minutes</strong></p>
          </div>
        )}

        <div className="reset-timer">
          <p className="reset-label">Access resumes in:</p>
          <p className="reset-time">{timeUntilReset}</p>
        </div>

        <div className="suggestions">
          <h2>Take a break! 🌟</h2>
          <ul>
            <li>Stretch and move around</li>
            <li>Grab a glass of water</li>
            <li>Take a few deep breaths</li>
            <li>Check out your other priorities</li>
          </ul>
        </div>

        <div className="actions">
          <button className="btn btn-secondary" onClick={openHistoryPage}>
            📊 View Your Stats
          </button>
          <button className="btn btn-primary" onClick={openLimitsPage}>
            ⚙️ Manage Limits
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Blocked />
  </React.StrictMode>
);

