import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './limits.css';
import 'antd/dist/reset.css';
import { Layout, Typography, Input, InputNumber, Button, Card, List, Space, Tag, message } from 'antd';

function Limits() {
  const [limits, setLimits] = useState({});
  const [newDomain, setNewDomain] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [domainSuggestions, setDomainSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadLimits();
    loadDomainSuggestions();
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

  const loadDomainSuggestions = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_TODAY_STATS'
      });

      if (response && response.sites) {
        // Get all domains and sort by time spent
        const domains = Object.entries(response.sites)
          .map(([domain, time]) => ({ domain, time }))
          .sort((a, b) => b.time - a.time)
          .map(item => item.domain);
        
        setDomainSuggestions(domains);
      }
    } catch (error) {
      console.error('Error loading domain suggestions:', error);
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

  const handleDomainInputChange = (e) => {
    const value = e.target.value;
    setNewDomain(value);
    setShowSuggestions(value.length > 0);
  };

  const selectDomain = (domain) => {
    setNewDomain(domain);
    setShowSuggestions(false);
  };

  const filteredSuggestions = domainSuggestions.filter(domain =>
    domain.toLowerCase().includes(newDomain.toLowerCase()) &&
    !limits[domain] // Don't suggest domains that already have limits
  );

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Layout.Content style={{ maxWidth: 740, margin: '0 auto', padding: 16 }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            marginBottom: 20,
          }}
          bodyStyle={{ padding: 24 }}
        >
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>⏰ Time Limits</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.9)' }}>Set daily time limits for websites</Typography.Text>
        </Card>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="Add New Limit">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div className="input-with-suggestions">
                <Typography.Text>Website Domain</Typography.Text>
                <Input
                  placeholder="e.g., youtube.com"
                  value={newDomain}
                  onChange={handleDomainInputChange}
                  onPressEnter={handleAddLimit}
                  onFocus={() => setShowSuggestions(newDomain.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredSuggestions.slice(0, 5).map((domain) => (
                      <div
                        key={domain}
                        className="suggestion-item"
                        onMouseDown={() => selectDomain(domain)}
                      >
                        {domain}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Typography.Text>Daily Limit (minutes)</Typography.Text>
                <InputNumber min={1} placeholder="e.g., 60" value={Number(newLimit) || undefined} onChange={(v) => setNewLimit(v)} style={{ width: '100%' }} />
              </div>

              <Button type="primary" onClick={handleAddLimit} block>Add Limit</Button>
              {message && <Typography.Text>{message}</Typography.Text>}
            </Space>
          </Card>

          <Card title="Active Limits">
            {loading ? (
              <Typography.Text type="secondary">Loading...</Typography.Text>
            ) : Object.keys(limits).length === 0 ? (
              <Space direction="vertical">
                <Typography.Text>No time limits set yet.</Typography.Text>
                <Typography.Text type="secondary">Add your first limit above to get started!</Typography.Text>
              </Space>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={Object.entries(limits)}
                renderItem={([domain, limitMinutes]) => (
                  <List.Item
                    actions={[<Button danger onClick={() => handleDeleteLimit(domain)} key="del">Remove</Button>]}
                  >
                    <List.Item.Meta
                      title={<Typography.Text strong>{domain}</Typography.Text>}
                      description={<Tag color="blue">{formatTime(limitMinutes)} per day</Tag>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Space>
      </Layout.Content>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Limits />
  </React.StrictMode>
);



