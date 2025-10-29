import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './limits.css';

function Limits() {
  const [limits, setLimits] = useState({});
  const [newDomain, setNewDomain] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddLimit = async () => {
    const domain = newDomain.trim().toLowerCase();
    const limitMinutes = parseInt(newLimit);

    if (!domain) {
      showMessage('❌ Please enter a domain');
      return;
    }

    if (!limitMinutes || limitMinutes <= 0) {
      showMessage('❌ Please enter a valid limit (minutes)');
      return;
    }

    // Clean domain (remove protocol, www, paths)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'SET_LIMIT',
        domain: cleanDomain,
        limitMinutes: limitMinutes
      });

      if (response.success) {
        showMessage(`✅ Set ${limitMinutes}min limit for ${cleanDomain}`);
        setNewDomain('');
        setNewLimit('');
        loadLimits();
      }
    } catch (error) {
      console.error('Error setting limit:', error);
      showMessage('❌ Failed to set limit');
    }
  };

  const handleDeleteLimit = async (domain) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'DELETE_LIMIT',
        domain: domain
      });

      if (response.success) {
        showMessage(`✅ Removed limit for ${domain}`);
        loadLimits();
      }
    } catch (error) {
      console.error('Error deleting limit:', error);
      showMessage('❌ Failed to delete limit');
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <div className="limits-container">
      <header className="limits-header">
        <h1>⏰ Time Limits</h1>
        <p className="subtitle">Set daily time limits for websites</p>
      </header>

      <main className="limits-main">
        {/* Add New Limit Form */}
        <div className="add-limit-card">
          <h2>Add New Limit</h2>
          
          <div className="form-group">
            <label>Website Domain</label>
            <input
              type="text"
              placeholder="e.g., youtube.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddLimit()}
            />
          </div>

          <div className="form-group">
            <label>Daily Limit (minutes)</label>
            <input
              type="number"
              placeholder="e.g., 60"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddLimit()}
              min="1"
            />
          </div>

          <button className="btn btn-primary" onClick={handleAddLimit}>
            Add Limit
          </button>

          {message && (
            <div className="message">{message}</div>
          )}
        </div>

        {/* Existing Limits */}
        <div className="limits-list-section">
          <h2>Active Limits</h2>
          
          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : Object.keys(limits).length === 0 ? (
            <div className="empty-state">
              <p>No time limits set yet.</p>
              <p className="hint">Add your first limit above to get started!</p>
            </div>
          ) : (
            <div className="limits-list">
              {Object.entries(limits).map(([domain, limitMinutes]) => (
                <div key={domain} className="limit-item">
                  <div className="limit-info">
                    <span className="limit-domain">{domain}</span>
                    <span className="limit-time">{formatTime(limitMinutes)} per day</span>
                  </div>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeleteLimit(domain)}
                    title="Remove limit"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Limits />
  </React.StrictMode>
);



