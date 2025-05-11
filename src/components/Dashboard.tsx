import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Form,
  DatePicker,
  TimePicker,
  Button,
  message,
  Divider,
  Spin,
  Typography,
  Popover,
  Badge,
  List,
  Progress,
  Alert,
  Layout,
} from "antd";
import { 
  BellOutlined, 
  DatabaseOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined
} from "@ant-design/icons";
import { Pie, Line, Column, Area } from "@ant-design/plots";
import axios from "axios";
import dayjs from "dayjs";
import runScriptInstance from "../services/run-script.ts";
import notificationServiceInstance from "../services/notification.ts";
import historyServiceInstance from "../services/history.ts";

const { Title } = Typography;
const { Content } = Layout;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [extractLoading, setExtractLoading] = useState(false);

  const [s3Loading, setS3Loading] = useState(true);
  const [s3Data, setS3Data] = useState({
    bucketDistribution: [],
    fileTypeStats: [],
    monthlyUploads: [],
  });
  const [athenaData, setAthenaData] = useState({
    totalTables: 0,
    queryStats: {
      total_queries: 0,
      successful_queries: 0,
      failed_queries: 0,
      avg_execution_time: 0,
    },
    tableSizes: [],
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    activeSessions: 0,
    completedSessions: 0,
    errorSessions: 0,
    totalDuration: 0, // minutes
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [s3Response, athenaResponse, historyResponse] = await Promise.all([
          axios.get("http://localhost:3000/s3/statistics"),
          axios.get("http://localhost:3000/athena/statistics"),
          historyServiceInstance.get(),
        ]);

        const fileTypesFiltered = s3Response.data.data.fileTypeStats.filter(
          (item: any) => !item.type.includes("/")
        );

        const totalFiles = fileTypesFiltered.reduce(
          (acc: number, curr: any) => acc + curr.count,
          0
        );

        const fileTypeStatsWithPercent = fileTypesFiltered.map((item: any) => ({
          type: item.type,
          count: item.count,
          percent: ((item.count / totalFiles) * 100).toFixed(2),
        }));

        setS3Data({
          bucketDistribution: s3Response.data.data.bucketDistribution || [],
          fileTypeStats: fileTypeStatsWithPercent,
          monthlyUploads: s3Response.data.data.monthlyUploads || [],
        });

        console.log('Raw tableSizes data:', athenaResponse.data.data.tableSizes);
        const processedTableSizes = athenaResponse.data.data.tableSizes.map((table: any) => {
          const rowCount = parseInt(table.rowCount);
          console.log(`Processing table ${table.table}:`, { original: table.rowCount, parsed: rowCount });
          return {
            ...table,
            rowCount: isNaN(rowCount) ? 0 : rowCount
          };
        });
        console.log('Processed tableSizes:', processedTableSizes);

        setAthenaData({
          ...athenaResponse.data.data,
          tableSizes: processedTableSizes
        });
        
        // Format and set recent sessions
        const formattedSessions = historyResponse.slice(0, 5).map((session: any) => ({
          key: session.id,
          sessionId: `S${session.id.toString().padStart(3, '0')}`,
          status: session.status,
          startTime: dayjs(session.startTime).format('YYYY-MM-DD HH:mm:ss'),
          duration: `${Math.floor(session.duration / 60)}h ${session.duration % 60}m`,
        }));
        setRecentSessions(formattedSessions);

        // Calculate session statistics
        const totalDuration = historyResponse.reduce((acc: number, session: any) => {
          return acc + (session.duration || 0);
        }, 0);

        const stats = {
          activeSessions: historyResponse.filter((session: any) => session.status === "Running").length,
          completedSessions: historyResponse.filter((session: any) => session.status === "Completed").length,
          errorSessions: historyResponse.filter((session: any) => session.status === "Error").length,
          totalDuration: totalDuration,
        };
        console.log(stats);
        setSessionStats(stats);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sessionData = [
    {
      key: "1",
      sessionId: "S001",
      status: "Active",
      startTime: "2024-12-15 09:00:00",
      duration: "2h 15m",
      progress: 75,
    },
    {
      key: "2",
      sessionId: "S002",
      status: "Completed",
      startTime: "2024-12-14 14:30:00",
      duration: "1h 30m",
      progress: 100,
    },
    {
      key: "3",
      sessionId: "S003",
      status: "Error",
      startTime: "2024-12-14 16:00:00",
      duration: "0h 45m",
      progress: 45,
    },
    {
      key: "4",
      sessionId: "S004",
      status: "Completed",
      startTime: "2024-12-13 11:00:00",
      duration: "2h 10m",
      progress: 100,
    },
    {
      key: "5",
      sessionId: "S005",
      status: "Active",
      startTime: "2024-12-15 10:00:00",
      duration: "1h 10m",
      progress: 30,
    },
  ];

  const columns = [
    { title: "Session ID", dataIndex: "sessionId", key: "sessionId" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag
          color={
            status === "Running" ? "green" : 
            status === "Error" ? "red" : 
            status === "Completed" ? "blue" : "default"
          }
        >
          {status}
        </Tag>
      ),
    },
    { title: "Start Time", dataIndex: "startTime", key: "startTime" },
    { title: "Duration", dataIndex: "duration", key: "duration" },
  ];

  const performanceData = [
    { date: "2024-12-01", type: "CPU", value: 45 },
    { date: "2024-12-01", type: "Memory", value: 60 },
    { date: "2024-12-01", type: "Disk", value: 30 },
    { date: "2024-12-02", type: "CPU", value: 50 },
    { date: "2024-12-02", type: "Memory", value: 65 },
    { date: "2024-12-02", type: "Disk", value: 35 },
    { date: "2024-12-03", type: "CPU", value: 55 },
    { date: "2024-12-03", type: "Memory", value: 70 },
    { date: "2024-12-03", type: "Disk", value: 40 },
    { date: "2024-12-04", type: "CPU", value: 60 },
    { date: "2024-12-04", type: "Memory", value: 75 },
    { date: "2024-12-04", type: "Disk", value: 45 },
    { date: "2024-12-05", type: "CPU", value: 65 },
    { date: "2024-12-05", type: "Memory", value: 80 },
    { date: "2024-12-05", type: "Disk", value: 50 },
    { date: "2024-12-06", type: "CPU", value: 70 },
    { date: "2024-12-06", type: "Memory", value: 85 },
    { date: "2024-12-06", type: "Disk", value: 55 },
    { date: "2024-12-07", type: "CPU", value: 75 },
    { date: "2024-12-07", type: "Memory", value: 90 },
    { date: "2024-12-07", type: "Disk", value: 60 },
  ];

  const onFinish = (values: any) => {
    const scheduledDateTime =
      dayjs(values.date).format("YYYY-MM-DD") +
      " " +
      dayjs(values.time).format("HH:mm:ss");
    message.success(`Session scheduled to run at ${scheduledDateTime}`);
  };

  const handleManualTrigger = () => {
    setLoading(true);
    runScriptInstance.runCleaning();
    setTimeout(() => {
      setLoading(false);
      message.success("Session triggered successfully!");
    }, 2000);
  };

  const handleManualTriggerExtract = () => {
    setExtractLoading(true);
    runScriptInstance.run();
    setTimeout(() => {
      setExtractLoading(false);
      message.success("Extract triggered successfully!");
    }, 2000);
  };

  const getHistory = async () => {
    try {
      const result = await historyServiceInstance.get();
      // Update session statistics
      const totalDuration = result.reduce((acc: number, session: any) => {
        return acc + (session.duration || 0);
      }, 0);

      const stats = {
        activeSessions: result.filter((session: any) => session.status === "Running").length,
        completedSessions: result.filter((session: any) => session.status === "Completed").length,
        errorSessions: result.filter((session: any) => session.status === "Error").length,
        totalDuration: totalDuration,
      };
      setSessionStats(stats);
    } catch (error) {
      message.error(error.message);
    }
  };

  const runCleaningService = async () => {
    try {
      message.info("Cleaning service is running...");
      const result = await historyServiceInstance.get();
      const maxId = result.length > 0 ? Math.max(...result.map((item) => item.id)) : 0;
      
      // Update session statistics
      const totalDuration = result.reduce((acc: number, session: any) => {
        return acc + (session.duration || 0);
      }, 0);

      const stats = {
        activeSessions: result.filter((session: any) => session.status === "Running").length,
        completedSessions: result.filter((session: any) => session.status === "Completed").length,
        errorSessions: result.filter((session: any) => session.status === "Error").length,
        totalDuration: totalDuration,
      };
      setSessionStats(stats);

      const res = await runScriptInstance.run();
      if (res) {
        message.success("Run success");
      }
    } catch (error) {
      message.error(error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Dashboard
        </Title>
      </div>

      <Content style={{ padding: '20px' }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <Title level={4} style={{ marginBottom: '20px' }}>
            <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Session Statistics
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <ThunderboltOutlined style={{ marginRight: '8px', color: '#3f8600' }} />
                      Active Sessions
                    </span>
                  }
                  value={sessionStats.activeSessions}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <CheckCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      Completed Sessions
                    </span>
                  }
                  value={sessionStats.completedSessions}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <CloseCircleOutlined style={{ marginRight: '8px', color: '#cf1322' }} />
                      Error Sessions
                    </span>
                  }
                  value={sessionStats.errorSessions}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <ClockCircleOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                      Total Duration
                    </span>
                  }
                  value={sessionStats.totalDuration}
                  suffix="min"
                  valueStyle={{ color: "#722ed1" }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <Title level={4} style={{ marginBottom: '20px' }}>
            <PieChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            S3 Storage Statistics
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Title level={5}>Bucket Distribution</Title>
                {s3Data.bucketDistribution.length > 0 ? (
                  <Pie
                    data={s3Data.bucketDistribution}
                    angleField="percent"
                    colorField="bucket"
                    height={300}
                    legend={{
                      position: "right",
                      layout: "vertical",
                    }}
                  />
                ) : (
                  <p>No data available</p>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Title level={5}>File Type Distribution</Title>
                {s3Data.fileTypeStats.length > 0 ? (
                  <Pie
                    data={s3Data.fileTypeStats}
                    angleField="count"
                    colorField="type"
                    height={300}
                    legend={{
                      position: "right",
                      layout: "vertical",
                    }}
                  />
                ) : (
                  <p>No data available</p>
                )}
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <Title level={4} style={{ marginBottom: '20px' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Athena Database Statistics
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      Total Tables
                    </span>
                  }
                  value={athenaData.totalTables}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <DatabaseOutlined style={{ marginRight: '8px', color: '#3f8600' }} />
                      Total Queries (30d)
                    </span>
                  }
                  value={athenaData.queryStats.total_queries}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <CheckCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                      Success Rate
                    </span>
                  }
                  value={Math.round(
                    (athenaData.queryStats.successful_queries /
                      athenaData.queryStats.total_queries) *
                      100 || 0
                  )}
                  suffix="%"
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title={
                    <span>
                      <ClockCircleOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                      Avg Execution Time
                    </span>
                  }
                  value={Math.round(athenaData.queryStats.avg_execution_time)}
                  suffix="ms"
                  valueStyle={{ color: "#722ed1" }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '24px'
            }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <LineChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Data Growth Over Time
              </Title>
              {s3Data.monthlyUploads.length > 0 ? (
                <Area
                  data={s3Data.monthlyUploads}
                  xField="month"
                  yField="count"
                  smooth={true}
                  height={300}
                  label={{
                    style: {
                      fill: '#aaa',
                    },
                  }}
                  point={{
                    size: 5,
                    shape: "diamond",
                  }}
                />
              ) : (
                <p>No data available</p>
              )}
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '24px'
            }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Table Sizes
              </Title>
              {athenaData.tableSizes && athenaData.tableSizes.length > 0 ? (
                <Column
                  data={athenaData.tableSizes}
                  xField="table"
                  yField="rowCount"
                  height={400}
                  label={{
                    position: "top",
                    style: {
                      fill: '#000',
                    },
                  }}
                  yAxis={{
                    label: {
                      formatter: (value: any) => {
                        if (typeof value !== 'number') {
                          return '0';
                        }
                        return value.toLocaleString();
                      },
                    },
                    min: 0,
                    tickCount: 5,
                  }}
                  meta={{
                    rowCount: {
                      alias: 'Number of Rows',
                      min: 0,
                    }
                  }}
                />
              ) : (
                <p>No data available</p>
              )}
            </div>
          </Col>
        </Row>

        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Title level={4} style={{ marginBottom: '20px' }}>
            <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Recent Sessions
          </Title>
          <Table
            columns={columns}
            dataSource={recentSessions}
            pagination={false}
            size="small"
          />
        </div>
      </Content>
    </Layout>
  );
};

export default Dashboard;
