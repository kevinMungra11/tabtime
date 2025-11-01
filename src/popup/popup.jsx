import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import 'antd/dist/reset.css';
import { Layout, Card, Statistic, Typography, Progress, Button, Space, List, Tag, Switch, Divider } from 'antd';
import { FieldTimeOutlined, BarChartOutlined, PauseCircleOutlined, PlayCircleOutlined, SafetyOutlined, IdcardOutlined } from '@ant-design/icons';

function App() {
  const [currentDomain, setCurrentDomain] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [todayStats, setTodayStats] = useState({ totalTime: 0, sitesCount: 0, sites: {} });
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [weekStats, setWeekStats] = useState({ weekTotal: 0, weekAvg: 0 });

  useEffect(() => {
    getCurrentTabDomain();
    getTodayStats();
    loadLimits();
    loadPauseState();
    loadWeekStats();
  }, []);

  const loadPauseState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_PAUSE_STATE'
      });
      if (response) {
        setIsPaused(response.isPaused || false);
        setIsIdle(response.isIdle || false);
      }
    } catch (error) {
      console.error('Error loading pause state:', error);
    }
  };

  const loadWeekStats = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_WEEK_STATS'
      });
      if (response) {
        setWeekStats({
          weekTotal: response.weekTotal || 0,
          weekAvg: response.weekAvg || 0
        });
      }
    } catch (error) {
      console.error('Error loading week stats:', error);
    }
  };

  const handleTogglePause = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'TOGGLE_PAUSE'
      });
      if (response) {
        setIsPaused(response.isPaused);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleAddToWhitelist = async () => {
    if (!currentDomain || currentDomain === 'Chrome Page' || currentDomain === 'Unknown' || currentDomain === 'Error') {
      return;
    }
    try {
      await chrome.runtime.sendMessage({
        action: 'ADD_TO_WHITELIST',
        domain: currentDomain
      });
    } catch (error) {
      console.error('Error adding to whitelist:', error);
    }
  };

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
      loadPauseState();
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
    <Layout style={{ minWidth: 380, maxWidth: 420, background: '#f8f9fa' }}>
      <Layout.Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography.Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>TabTime</Typography.Title>
          <Space size={8}>
            {isIdle && <Tag color="orange" style={{ border: 'none', margin: 0 }}>Idle</Tag>}
            {isPaused && <Tag color="red" style={{ border: 'none', margin: 0 }}>Paused</Tag>}
          </Space>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13 }}>Track. Limit. Improve.</Typography.Text>
          <Switch
            checked={!isPaused}
            onChange={handleTogglePause}
            checkedChildren={<PlayCircleOutlined />}
            unCheckedChildren={<PauseCircleOutlined />}
            style={{ background: isPaused ? '#ff4d4f' : '#52c41a' }}
          />
        </div>
      </Layout.Header>

      <Layout.Content style={{ padding: 20, maxHeight: 600, overflowY: 'auto' }}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {/* Week Summary */}
          <div>
            <Typography.Text 
              type="secondary" 
              style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: 12
              }}
            >
              This Week Summary
            </Typography.Text>
            <Card 
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: 'none'
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Space.Compact style={{ width: '100%', gap: 16 }}>
                <div style={{ flex: 1, textAlign: 'center', paddingRight: 16, borderRight: '1px solid #f0f0f0' }}>
                  <Statistic 
                    title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>Week Total</span>} 
                    value={formatTime(weekStats.weekTotal)} 
                    prefix={<FieldTimeOutlined style={{ color: '#667eea', fontSize: 16 }} />}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#262626' }}
                  />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <Statistic 
                    title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>Daily Avg</span>} 
                    value={formatTime(weekStats.weekAvg)} 
                    prefix={<BarChartOutlined style={{ color: '#764ba2', fontSize: 16 }} />}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#262626' }}
                  />
                </div>
              </Space.Compact>
            </Card>
          </div>

          {/* Today's Activity */}
          <div>
            <Typography.Text 
              type="secondary" 
              style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: 12
              }}
            >
              Today's Activity
            </Typography.Text>
            <Space.Compact style={{ width: '100%', gap: 12 }}>
              <Card 
                style={{ 
                  flex: 1, 
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f5f7ff 0%, #fff 100%)'
                }}
                bodyStyle={{ padding: '18px' }}
              >
                <Statistic 
                  title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>Total Time</span>} 
                  value={formatTime(todayStats.totalTime)} 
                  prefix={<FieldTimeOutlined style={{ color: '#667eea' }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </Card>
              <Card 
                style={{ 
                  flex: 1, 
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #faf5ff 0%, #fff 100%)'
                }}
                bodyStyle={{ padding: '18px' }}
              >
                <Statistic 
                  title={<span style={{ fontSize: 11, color: '#8c8c8c' }}>Sites Visited</span>} 
                  value={todayStats.sitesCount} 
                  prefix={<BarChartOutlined style={{ color: '#764ba2' }} />}
                  valueStyle={{ fontSize: 20, fontWeight: 700 }}
                />
              </Card>
            </Space.Compact>
          </div>

          {/* Current Site */}
          <div>
            <Typography.Text 
              type="secondary" 
              style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: 12
              }}
            >
              Current Site
            </Typography.Text>
            <Card
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: 'none'
              }}
              bodyStyle={{ padding: '20px' }}
            >
              {loading ? (
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>Loading...</Typography.Text>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  <div>
                    <Typography.Title 
                      level={5} 
                      style={{ 
                        margin: 0, 
                        marginBottom: 16,
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#262626',
                        wordBreak: 'break-word'
                      }}
                    >
                      {currentDomain}
                    </Typography.Title>
                  </div>
                  {currentDomain !== 'Chrome Page' && currentDomain !== 'Unknown' && currentDomain !== 'Error' && (
                    <>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Time spent today</Typography.Text>
                          <Button 
                            size="small" 
                            icon={<SafetyOutlined />} 
                            onClick={handleAddToWhitelist}
                            style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                          >
                            Whitelist
                          </Button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Typography.Text style={{ fontSize: 24, fontWeight: 700, color: '#262626' }}>
                            {formatTime(timeSpent)}
                          </Typography.Text>
                          {limitSeconds && (
                            <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
                              / {formatTime(limitSeconds)} limit
                            </Typography.Text>
                          )}
                        </div>
                        {limitSeconds && (
                          <Progress 
                            percent={Math.min(Math.round(limitProgress), 100)} 
                            status={isOverLimit ? 'exception' : isNearLimit ? 'active' : 'normal'} 
                            showInfo={false}
                            strokeWidth={8}
                            style={{ marginBottom: 12 }}
                          />
                        )}
                        <Space size={8}>
                          {isOverLimit && <Tag color="error" style={{ margin: 0 }}>Time limit exceeded</Tag>}
                          {isNearLimit && !isOverLimit && <Tag color="warning" style={{ margin: 0 }}>Approaching limit</Tag>}
                        </Space>
                      </div>
                    </>
                  )}
                </Space>
              )}
            </Card>
          </div>

          {/* Top Sites */}
          {topSites.length > 0 && (
            <div>
              <Typography.Text 
                type="secondary" 
                style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: 12
                }}
              >
                Top Sites Today
              </Typography.Text>
              <Card 
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: 'none'
                }}
                bodyStyle={{ padding: 0 }}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={topSites}
                  renderItem={(site, index) => (
                    <List.Item 
                      style={{ 
                        padding: '14px 20px',
                        borderBottom: index < topSites.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13
                          }}>
                            {index + 1}
                          </div>
                        }
                        title={
                          <Typography.Text strong style={{ fontSize: 14, color: '#262626' }} ellipsis>
                            {site.domain}
                          </Typography.Text>
                        }
                        description={
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {formatTime(site.time)}
                          </Typography.Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ paddingTop: 8 }}>
            <Space.Compact style={{ width: '100%', gap: 12 }}>
              <Button 
                block 
                onClick={() => chrome.tabs.create({ url: 'limits.html' })}
                style={{ 
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                ⏰ Limits
              </Button>
              <Button 
                type="primary" 
                block 
                onClick={() => chrome.tabs.create({ url: 'history.html' })}
                style={{ 
                  height: 40,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                📊 History
              </Button>
            </Space.Compact>
          </div>
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

