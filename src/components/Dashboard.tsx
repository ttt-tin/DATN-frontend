import React, { useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Form, DatePicker, TimePicker, Button, message, Divider } from 'antd';
import { Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import runScriptInstance from '../services/run-script.ts';
import historyServiceInstance from '../services/history.ts';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionDatas] = useState<any>([]);

  React.useEffect(() => {
    getHistory();
  }, [])

  // Hardcoded data for statistics
  const stats = {
    activeSessions: 5,
    completedSessions: 120,
    errorSessions: 2,
  };

  // Hardcoded data for session details
  // const sessionData = [
  //   {
  //     key: '1',
  //     sessionId: 'S001',
  //     status: 'Active',
  //     startTime: '2024-12-15 09:00:00',
  //     duration: '2h 15m',
  //   },
  //   {
  //     key: '2',
  //     sessionId: 'S002',
  //     status: 'Completed',
  //     startTime: '2024-12-14 14:30:00',
  //     duration: '1h 30m',
  //   },
  //   {
  //     key: '3',
  //     sessionId: 'S003',
  //     status: 'Error',
  //     startTime: '2024-12-14 16:00:00',
  //     duration: '0h 45m',
  //   },
  //   {
  //     key: '4',
  //     sessionId: 'S004',
  //     status: 'Completed',
  //     startTime: '2024-12-13 11:00:00',
  //     duration: '2h 10m',
  //   },
  //   {
  //     key: '5',
  //     sessionId: 'S005',
  //     status: 'Active',
  //     startTime: '2024-12-15 10:00:00',
  //     duration: '1h 10m',
  //   },
  // ];

  const columns = [
    {
      title: 'Session ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = status === 'Completed' ? 'green' : status === 'Error' ? 'red' : 'blue';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
    },
    {
      title: 'Duration (mitnute)',
      dataIndex: 'duration',
      key: 'duration',
    },
  ];

  const sessionAnalytics = [
    { date: '2024-12-01', success: 30, fail: 5 },
    { date: '2024-12-02', success: 25, fail: 4 },
    { date: '2024-12-03', success: 32, fail: 6 },
    { date: '2024-12-04', success: 29, fail: 3 },
    { date: '2024-12-05', success: 40, fail: 8 },
    { date: '2024-12-06', success: 38, fail: 7 },
    { date: '2024-12-07', success: 35, fail: 6 },
  ];

  const lineConfig = {
    data: sessionAnalytics,
    xField: 'date',
    yField: 'success',
    seriesField: 'type',
    smooth: true,
    height: 300,
    appendPadding: [10, 10, 10, 10],
  };

  const onFinish = (values: any) => {
    const scheduledDateTime =
      dayjs(values.date).format('YYYY-MM-DD') + ' ' + dayjs(values.time).format('HH:mm:ss');
    message.success(`Session scheduled to run at ${scheduledDateTime}`);
    console.log('Schedule:', scheduledDateTime);
  };

  const handleManualTrigger = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success('Session triggered successfully!');
    }, 2000);
  };

  const getHistory = async () => {
    try {
      const result = await historyServiceInstance.get();
      setSessionDatas(result);
      console.log(result)
    }
    catch (error) {
      message.error(error.message);
    }
  }

  const runCleaningService = async () => {
    try {
      message.info('Cleaning service is running...')
      setSessionDatas((prev) => {
        const maxId = prev.length > 0 ? Math.max(...prev.map(item => item.id)) : 0;
      
        return [
          ...prev,
          {
            id: maxId + 1,  // Increment the max ID for the new entry
            status: 'Running',
            time: new Date().toISOString(),  // Using ISO string format for time
          }
        ];
      });
      
      const res = await runScriptInstance.run();
      if (res) {
        message.success('Run success');
      }
    }
    catch (error) {
      message.error(error.message)
    }
  }


  return (
    <div>
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Running Sessions"
              value={stats.activeSessions}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Completed Sessions"
              value={stats.completedSessions}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Error Sessions"
              value={stats.errorSessions}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={24}>
          <Card title="Session Success vs Failures Over Time" bordered={false}>
            <Line {...lineConfig} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={24}>
          <Card title="Session Control Panel" bordered={false}>
            <Divider orientation="left">Schedule a Session</Divider>
            <Form layout="inline" onFinish={onFinish}>
              <Form.Item
                name="date"
                rules={[{ required: true, message: 'Please select a date!' }]}
              >
                <DatePicker placeholder="Select Date" />
              </Form.Item>
              <Form.Item
                name="time"
                rules={[{ required: true, message: 'Please select a time!' }]}
              >
                <TimePicker placeholder="Select Time" format="HH:mm" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Schedule Session
                </Button>
              </Form.Item>
            </Form>
            <Divider orientation="left">Trigger a Session Manually</Divider>
            <Button type="primary" onClick={runCleaningService} loading={loading}>
              Trigger Session
            </Button>
          </Card>
        </Col>
      </Row>
      <Card title="Session Details" bordered={false}>
        <Table columns={columns} dataSource={sessionData} pagination={{ pageSize: 5 }} />
      </Card>
    </div>
  );
};

export default Dashboard;
