import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './history.css';

function History() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_HISTORY'
      });

      if (response && response.history) {
        setHistoryData(response.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <h1>📊 7-Day History</h1>
        <p className="subtitle">Your browsing activity over the past week</p>
      </header>

      <main className="history-main">
        {loading ? (
          <div className="loading-state">
            <p>Loading history...</p>
          </div>
        ) : historyData.length === 0 ? (
          <div className="empty-state">
            <p>No history data yet. Start browsing to see your stats!</p>
          </div>
        ) : (
          <div className="history-timeline">
            {historyData.map((day) => (
              <div key={day.date} className="day-card">
                <div className="day-header">
                  <div className="day-info">
                    <span className="day-badge">{getDayOfWeek(day.date)}</span>
                    <h2 className="day-title">{formatDate(day.date)}</h2>
                  </div>
                  <div className="day-stats">
                    <div className="stat">
                      <span className="stat-value">{formatTime(day.totalTime)}</span>
                      <span className="stat-label">Total</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{day.sitesCount}</span>
                      <span className="stat-label">Sites</span>
                    </div>
                  </div>
                </div>

                {day.sites && day.sites.length > 0 && (
                  <div className="sites-list">
                    {day.sites.map((site, index) => (
                      <div key={index} className="site-row">
                        <span className="site-name">{site.domain}</span>
                        <span className="site-time">{formatTime(site.time)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <History />
  </React.StrictMode>
);

