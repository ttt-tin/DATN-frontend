import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Typography, message } from 'antd';

const { Title } = Typography;
import historyServiceInstance from '../services/history.ts';

const History: React.FC = () => {
  const navigate = useNavigate();

  const [sessionHistory, setSessionHistory] = React.useState<any>([]);

  React.useEffect(() => {
    getHistory();
  }, [])

  const getHistory = async () => {
    try {
      const result = await historyServiceInstance.get();
      setSessionHistory(result);
      console.log(result)
    }
    catch (error) {
      message.error(error.message);
    }
  }

  // Hardcoded session history data
  // const sessionHistory = [
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
      render: (text: string) => (
        <Button type="link" onClick={() => navigate(`/session/${text}`)}>
          {text}
        </Button>
      ),
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
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: "20px" }}>
        History
      </Title>
      <Table columns={columns} dataSource={sessionHistory} pagination={{ pageSize: 5 }} />
    </div>
  );
};

export default History;
