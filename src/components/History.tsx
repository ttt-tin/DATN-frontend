import React, { useState } from 'react';
import { Table, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const History: React.FC = () => {
  // Sample session history data
  const sampleData = [
    {
      id: "1",
      status: "Completed",
      start_date: "2024-12-01T08:00:00Z",
      end_date: "2024-12-01T10:00:00Z"
    },
    {
      id: "2",
      status: "In Progress",
      start_date: "2024-12-02T09:00:00Z",
      end_date: "2024-12-02T11:00:00Z"
    }
  ];

  const [sessionData, setSessionData] = useState<any[]>(sampleData); // Set the sample data to the state
  const navigate = useNavigate();

  // Define the columns for the table
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span>{text}</span>, // Display the session ID
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => <span>{text}</span>, // Display session status
    },
    {
      title: 'Start Date',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (text: string) => <span>{new Date(text).toLocaleString()}</span>, // Format start date
    },
    {
      title: 'End Date',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (text: string) => <span>{new Date(text).toLocaleString()}</span>, // Format end date
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/session/${record.id}`)} // Navigate to session detail page
        >
          View Details
        </Button>
      ),
    }
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Session History</h2>
      <Table
        dataSource={sessionData} // Session data from the sample
        columns={columns} // Columns to display
        rowKey="id" // Ensure each row has a unique key
        pagination={{ pageSize: 10 }} // Paginate the table with a page size of 10
      />
    </div>
  );
};

export default History;
