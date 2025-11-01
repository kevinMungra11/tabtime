import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './blocked.css';
import 'antd/dist/reset.css';
import { Typography, Button, Card, Space, Alert } from 'antd';
import { WarningOutlined, UnlockOutlined } from '@ant-design/icons';

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

  const handleEmergencyOverride = async () => {
    if (!domain) return;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'EMERGENCY_OVERRIDE',
        domain: domain
      });
      
      // Redirect to the domain
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, {
            url: `https://${domain}`
          });
        }
      });
    } catch (error) {
      console.error('Error enabling emergency override:', error);
    }
  };

  return (
    <div className="blocked-container">
      <Card className="blocked-content">
        <div className="icon">⏱️</div>
        <Typography.Title level={1} style={{ margin: 0 }}>Time's Up!</Typography.Title>
        <Typography.Paragraph className="subtitle">
          You've reached your daily limit for <strong>{domain}</strong>
        </Typography.Paragraph>

        {limit > 0 && (
          <div className="limit-info-box">
            <Typography.Text>Daily Limit: <strong>{limit} minutes</strong></Typography.Text>
          </div>
        )}

        <div className="reset-timer">
          <Typography.Text className="reset-label">Access resumes in:</Typography.Text>
          <Typography.Title level={2} className="reset-time" style={{ margin: 0 }}>{timeUntilReset}</Typography.Title>
        </div>

        <div className="suggestions">
          <Typography.Title level={3} style={{ textAlign: 'center' }}>Take a break! 🌟</Typography.Title>
          <ul>
            <li>Stretch and move around</li>
            <li>Grab a glass of water</li>
            <li>Take a few deep breaths</li>
            <li>Check out your other priorities</li>
          </ul>
        </div>

        <Alert
          message="Need urgent access?"
          description="Emergency override allows one-time access for today only. Use responsibly!"
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger icon={<UnlockOutlined />} onClick={handleEmergencyOverride}>
              Override
            </Button>
          }
        />

        <Space className="actions">
          <Button onClick={openHistoryPage}>📊 View Your Stats</Button>
          <Button type="primary" onClick={openLimitsPage}>⚙️ Manage Limits</Button>
        </Space>
      </Card>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Blocked />
  </React.StrictMode>
);

