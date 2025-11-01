import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './history.css';
import 'antd/dist/reset.css';
import { Layout, Typography, Card, List, Tag, Space, Button, Row, Col, Statistic, Divider } from 'antd';
import { BarChartOutlined, FieldTimeOutlined } from '@ant-design/icons';

function History() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

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

  const handleSyncHistory = async () => {
    setSyncing(true);
    setSyncMessage('Analyzing your browsing history...');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'SYNC_HISTORY',
        days: 7
      });

      if (response.success) {
        const minutes = Math.floor(response.timeImported / 60);
        setSyncMessage(`✅ Successfully imported ~${minutes} minutes from ${response.itemsProcessed} history items!`);
        
        // Reload history data
        setTimeout(() => {
          loadHistoryData();
          setSyncMessage('');
        }, 3000);
      } else {
        setSyncMessage(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      console.error('Error syncing history:', error);
      setSyncMessage('❌ Failed to sync history');
    } finally {
      setSyncing(false);
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

  // Aggregate helpers
  const weeklyTotals = () => {
    let total = 0;
    let sites = new Map();
    historyData.forEach(day => {
      total += day.totalTime || 0;
      (day.sites || []).forEach(s => {
        sites.set(s.domain, (sites.get(s.domain) || 0) + (s.time || 0));
      });
    });
    const top = Array.from(sites.entries())
      .map(([domain, time]) => ({ domain, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
    return { total, top };
  };

  const weekly = weeklyTotals();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '28px 20px',
        color: '#fff'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>📊 Browsing History</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.9)' }}>Insights from your last 7 days</Typography.Text>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button onClick={handleSyncHistory} loading={syncing}>🔄 Import Browser History</Button>
            {syncMessage && <Typography.Text style={{ color: '#fff' }}>{syncMessage}</Typography.Text>}
          </div>
        </div>
      </div>

      {/* Content */}
      <Layout.Content style={{ padding: 20 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Summary row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={8}>
              <Card>
                <Statistic title="Total Time (7d)" value={formatTime(weekly.total)} prefix={<FieldTimeOutlined />} />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={16}>
              <Card title={<Space><BarChartOutlined /> Top Sites (7d)</Space>} bodyStyle={{ padding: 0 }}>
                <List
                  itemLayout="horizontal"
                  dataSource={weekly.top}
                  renderItem={(item, idx) => (
                    <List.Item style={{ padding: '10px 16px' }}>
                      <List.Item.Meta
                        avatar={<Tag color="purple">{idx + 1}</Tag>}
                        title={<Typography.Text strong>{item.domain}</Typography.Text>}
                        description={<Typography.Text type="secondary">{formatTime(item.time)}</Typography.Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          <Divider>Daily Breakdown</Divider>

          {/* Days list */}
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {loading ? (
              <Card><Typography.Text type="secondary">Loading history...</Typography.Text></Card>
            ) : historyData.length === 0 ? (
              <Card><Typography.Text type="secondary">No history data yet. Start browsing to see your stats!</Typography.Text></Card>
            ) : (
              historyData.map((day) => (
                <Card key={day.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={12}>
                      <Tag color="purple">{getDayOfWeek(day.date)}</Tag>
                      <Typography.Title level={4} style={{ margin: 0 }}>{formatDate(day.date)}</Typography.Title>
                    </Space>
                    <Space>
                      <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                        <Typography.Text type="secondary">Total</Typography.Text>
                        <Typography.Text strong>{formatTime(day.totalTime)}</Typography.Text>
                      </Space>
                      <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                        <Typography.Text type="secondary">Sites</Typography.Text>
                        <Typography.Text strong>{day.sitesCount}</Typography.Text>
                      </Space>
                    </Space>
                  </div>
                  {day.sites && day.sites.length > 0 && (
                    <List
                      style={{ marginTop: 12 }}
                      itemLayout="horizontal"
                      dataSource={day.sites}
                      renderItem={(site) => (
                        <List.Item>
                          <List.Item.Meta
                            title={<Typography.Text strong>{site.domain}</Typography.Text>}
                            description={<Typography.Text type="secondary">{formatTime(site.time)}</Typography.Text>}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              ))
            )}
          </Space>
        </div>
      </Layout.Content>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <History />
  </React.StrictMode>
);

