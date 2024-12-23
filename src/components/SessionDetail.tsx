import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag } from 'antd';

const SessionDetail: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Hardcoded session details for demonstration purposes
  const sessionDetails = {
    S001: {
      sessionId: 'S001',
      status: 'Completed',
      startTime: '2024-12-15 09:00:00',
      endTime: '2024-12-15 11:15:00',
      duration: '2h 15m',
      actions: ['Data Cleaning', 'Data Transformation'],
      logs: 'All tasks completed successfully.',
    },
    S002: {
      sessionId: 'S002',
      status: 'Completed',
      startTime: '2024-12-14 14:30:00',
      endTime: '2024-12-14 16:00:00',
      duration: '1h 30m',
      actions: ['Data Extraction', 'Validation'],
      logs: 'Validation passed with no errors.',
    },
    S003: {
      sessionId: 'S003',
      status: 'Error',
      startTime: '2024-12-14 16:00:00',
      endTime: '2024-12-14 16:45:00',
      duration: '0h 45m',
      actions: ['Data Cleaning'],
      logs: 'Error encountered during cleaning: Missing values.',
    },
  };

  const session = sessionDetails[sessionId || ''] || null;

  if (!session) {
    return (
      <Card>
        <h2>Session Not Found</h2>
        <p>The session with ID {sessionId} does not exist.</p>
        <Button type="primary" onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </Card>
    );
  }

  return (
    <Card title={`Session Details - ${session.sessionId}`} extra={<Button onClick={() => navigate('/history')}>Back to History</Button>}>
      <Descriptions bordered>
        <Descriptions.Item label="Session ID">{session.sessionId}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={session.status === 'Completed' ? 'blue' : session.status === 'Error' ? 'red' : 'green'}>
            {session.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Start Time">{session.startTime}</Descriptions.Item>
        <Descriptions.Item label="End Time">{session.endTime}</Descriptions.Item>
        <Descriptions.Item label="Duration">{session.duration}</Descriptions.Item>
        <Descriptions.Item label="Actions Taken">{session.actions.join(', ')}</Descriptions.Item>
        <Descriptions.Item label="Logs" span={2}>{session.logs}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default SessionDetail;
