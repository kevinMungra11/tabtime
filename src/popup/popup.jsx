import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

function App() {
  const [currentDomain, setCurrentDomain] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentTabDomain();
  }, []);

  const getCurrentTabDomain = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url) {
        const domain = extractDomain(tab.url);
        setCurrentDomain(domain);
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

  return (
    <div className="container">
      <h1>TabTime</h1>
      
      <div className="current-site">
        <h2>Current Site</h2>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <div className="domain-display">
            <p className="domain">{currentDomain}</p>
          </div>
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

