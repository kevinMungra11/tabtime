import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import 'antd/dist/reset.css';
import { Layout, Card, Statistic, Typography, Progress, Button, Space, List, Tag } from 'antd';
import { FieldTimeOutlined, BarChartOutlined } from '@ant-design/icons';

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
    <Layout style={{ minWidth: 360, maxWidth: 380, background: '#fff' }}>
      <Layout.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>TabTime</Typography.Title>
          <Tag color="purple" style={{ border: 'none' }}>Phase 1</Tag>
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.9)' }}>Track. Limit. Improve.</Typography.Text>
      </Layout.Header>

      <Layout.Content style={{ padding: 14 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">TODAY'S ACTIVITY</Typography.Text>
          <Space.Compact style={{ width: '100%' }}>
            <Card style={{ flex: 1 }}>
              <Statistic title="Total Time" value={formatTime(todayStats.totalTime)} prefix={<FieldTimeOutlined />} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Statistic title="Sites Visited" value={todayStats.sitesCount} prefix={<BarChartOutlined />} />
            </Card>
          </Space.Compact>

          <Typography.Text type="secondary">CURRENT SITE</Typography.Text>
          <Card>
            {loading ? (
              <Typography.Text type="secondary">Loading...</Typography.Text>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Typography.Title level={5} style={{ margin: 0 }}>{currentDomain}</Typography.Title>
                {currentDomain !== 'Chrome Page' && currentDomain !== 'Unknown' && currentDomain !== 'Error' && (
                  <>
                    <Typography.Text type="secondary">Time spent today</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0 }}>{formatTime(timeSpent)} {limitSeconds ? <Typography.Text type="secondary">/ {formatTime(limitSeconds)} limit</Typography.Text> : null}</Typography.Title>
                    {limitSeconds ? (
                      <Progress percent={Math.min(Math.round(limitProgress), 100)} status={isOverLimit ? 'exception' : isNearLimit ? 'active' : 'normal'} showInfo={false} />
                    ) : null}
                    {isOverLimit && <Tag color="error">Time limit exceeded</Tag>}
                    {isNearLimit && !isOverLimit && <Tag color="warning">Approaching time limit</Tag>}
                  </>
                )}
              </Space>
            )}
          </Card>

          {topSites.length > 0 && (
            <>
              <Typography.Text type="secondary">TOP SITES TODAY</Typography.Text>
              <Card bodyStyle={{ padding: 0 }}>
                <List
                  itemLayout="horizontal"
                  dataSource={topSites}
                  renderItem={(site, index) => (
                    <List.Item style={{ padding: '10px 16px' }}>
                      <List.Item.Meta
                        avatar={<Tag color="purple">{index + 1}</Tag>}
                        title={<Typography.Text strong ellipsis>{site.domain}</Typography.Text>}
                        description={<Typography.Text type="secondary">{formatTime(site.time)}</Typography.Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </>
          )}

          <Space.Compact style={{ width: '100%' }}>
            <Button block onClick={() => chrome.tabs.create({ url: 'limits.html' })}>⏰ Manage Limits</Button>
            <Button type="primary" block onClick={() => chrome.tabs.create({ url: 'history.html' })}>📊 View History</Button>
          </Space.Compact>
        </Space>
      </Layout.Content>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

