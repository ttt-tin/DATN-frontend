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
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { Pie, Line } from "@ant-design/plots";
import axios from "axios";
import dayjs from "dayjs";
import runScriptInstance from "../services/run-script.ts";
import notificationServiceInstance from "../services/notification.ts";

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);

  const [s3Loading, setS3Loading] = useState(true);
  const [s3Data, setS3Data] = useState({
    bucketDistribution: [],
    fileTypeStats: [],
    monthlyUploads: [],
  });

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationServiceInstance.get();
      setNotifications(res);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const handleClick = async () => {
    await fetchNotifications();
    setOpen(true);
  };

  const content = (
    <List
      size="small"
      dataSource={notifications}
      locale={{ emptyText: "No notifications" }}
      renderItem={(item: any) => {
        const color =
          item.status === "Success"
            ? "green"
            : item.status === "Error"
            ? "red"
            : "gray";
        return (
          <List.Item>
            <span style={{ color }}>
              <strong>{item.type}</strong>: {item.desc}
            </span>
          </List.Item>
        );
      }}
    />
  );

  useEffect(() => {
    const fetchS3Stats = async () => {
      try {
        let response = await axios.get("http://localhost:3000/s3/statistics");
        response = response.data;

        const fileTypesFiltered = response.data.fileTypeStats.filter(
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
          bucketDistribution: response.data.bucketDistribution || [],
          fileTypeStats: fileTypeStatsWithPercent,
          monthlyUploads: response.data.monthlyUploads || [],
        });
        console.log(JSON.stringify(fileTypeStatsWithPercent));
      } catch (error) {
        console.error("Error fetching S3 stats:", error);
        setS3Data({
          bucketDistribution: [],
          fileTypeStats: [],
          monthlyUploads: [],
        });
      } finally {
        setS3Loading(false);
      }
    };

    fetchS3Stats();
  }, []);

  const stats = {
    activeSessions: 5,
    completedSessions: 120,
    errorSessions: 2,
  };

  const sessionData = [
    {
      key: "1",
      sessionId: "S001",
      status: "Active",
      startTime: "2024-12-15 09:00:00",
      duration: "2h 15m",
    },
    {
      key: "2",
      sessionId: "S002",
      status: "Completed",
      startTime: "2024-12-14 14:30:00",
      duration: "1h 30m",
    },
    {
      key: "3",
      sessionId: "S003",
      status: "Error",
      startTime: "2024-12-14 16:00:00",
      duration: "0h 45m",
    },
    {
      key: "4",
      sessionId: "S004",
      status: "Completed",
      startTime: "2024-12-13 11:00:00",
      duration: "2h 10m",
    },
    {
      key: "5",
      sessionId: "S005",
      status: "Active",
      startTime: "2024-12-15 10:00:00",
      duration: "1h 10m",
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
            status === "Active" ? "green" : status === "Error" ? "red" : "blue"
          }
        >
          {status}
        </Tag>
      ),
    },
    { title: "Start Time", dataIndex: "startTime", key: "startTime" },
    { title: "Duration", dataIndex: "duration", key: "duration" },
  ];

  const sessionAnalytics = [
    { date: "2024-12-01", success: 30, fail: 5 },
    { date: "2024-12-02", success: 25, fail: 4 },
    { date: "2024-12-03", success: 32, fail: 6 },
    { date: "2024-12-04", success: 29, fail: 3 },
    { date: "2024-12-05", success: 40, fail: 8 },
    { date: "2024-12-06", success: 38, fail: 7 },
    { date: "2024-12-07", success: 35, fail: 6 },
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
      setSessionDatas(result);
      console.log(result);
    } catch (error) {
      message.error(error.message);
    }
  };

  const runCleaningService = async () => {
    try {
      message.info("Cleaning service is running...");
      setSessionDatas((prev) => {
        const maxId =
          prev.length > 0 ? Math.max(...prev.map((item) => item.id)) : 0;

        return [
          ...prev,
          {
            id: maxId + 1, // Increment the max ID for the new entry
            status: "Running",
            time: new Date().toISOString(), // Using ISO string format for time
          },
        ];
      });

      const res = await runScriptInstance.run();
      if (res) {
        message.success("Run success");
      }
    } catch (error) {
      message.error(error.message);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: "20px" }}>
        Dashboard
      </Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Bucket Distribution">
            {s3Loading ? (
              <Spin />
            ) : s3Data.bucketDistribution.length > 0 ? (
              <Pie
                data={s3Data.bucketDistribution}
                angleField="percent"
                colorField="bucket"
                label={false}
                height={300}
              />
            ) : (
              <p>No data available</p>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="File Type Distribution">
            {s3Loading ? (
              <Spin />
            ) : s3Data.fileTypeStats.length > 0 ? (
              <Pie
                data={s3Data.fileTypeStats}
                angleField="count"
                colorField="type"
                label={false}
                height={300}
              />
            ) : (
              <p>No data available</p>
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: "16px" }}>
        <Col span={24}>
          <Card title="Data Pushed to S3 by Month">
            {s3Loading ? (
              <Spin />
            ) : s3Data.monthlyUploads.length > 0 ? (
              <Line
                data={s3Data.monthlyUploads}
                xField="month"
                yField="count"
                smooth={true}
                height={300}
              />
            ) : (
              <p>No data available</p>
            )}
          </Card>
        </Col>
      </Row>
      <Card title="Session Statistics" style={{ marginBottom: "16px" }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Active Sessions"
                value={stats.activeSessions}
                valueStyle={{ color: "#3f8600" }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Completed Sessions"
                value={stats.completedSessions}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Error Sessions"
                value={stats.errorSessions}
                valueStyle={{ color: "#cf1322" }}
              />
            </Card>
          </Col>
        </Row>
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 500 }}>Trigger a Session Manually</div>
            <Popover
              content={content}
              title="Notifications"
              trigger="click"
              open={open}
              onOpenChange={(visible) => setOpen(visible)}
            >
              <Badge count={notifications.length} offset={[0, 10]}>
                <Button
                  icon={<BellOutlined />}
                  type="text"
                  onClick={handleClick}
                />
              </Badge>
            </Popover>
          </div>

          {/* Divider phía dưới */}
          <Divider style={{ marginTop: 8 }} />
        </>
        <Button type="primary" onClick={handleManualTrigger} loading={loading}>
          Trigger Session
        </Button>

        <Button
          type="outlined"
          onClick={handleManualTriggerExtract}
          loading={extractLoading}
          style={{ marginLeft: "16px" }}
        >
          Trigger Extract
        </Button>
      </Card>
      <Row gutter={16} style={{ marginBottom: "16px" }}>
        <Col span={24}>
          <Card title="Session Success vs Failures Over Time" bordered={false}>
            <Line
              data={sessionAnalytics}
              xField="date"
              yField="success"
              seriesField="type"
              smooth={true}
              height={300}
              appendPadding={[10, 10, 10, 10]}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: "16px" }}>
        <Col span={24}>
          <Card title="Session Control Panel" bordered={false}>
            <Divider orientation="left">Schedule a Session</Divider>
            <Form layout="inline" onFinish={onFinish}>
              <Form.Item
                name="date"
                rules={[{ required: true, message: "Please select a date!" }]}
              >
                <DatePicker placeholder="Select Date" />
              </Form.Item>
              <Form.Item
                name="time"
                rules={[{ required: true, message: "Please select a time!" }]}
              >
                <TimePicker placeholder="Select Time" format="HH:mm" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Schedule Session
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
      <Card title="Session Details" bordered={false}>
        <Table
          columns={columns}
          dataSource={sessionData}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
