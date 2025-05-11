import React, { useState } from "react";
import {
  Card,
  Form,
  DatePicker,
  TimePicker,
  Button,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Layout,
} from "antd";
import { SettingOutlined, ClockCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import runScriptInstance from "../services/run-script.ts";

const { Title } = Typography;
const { Content } = Layout;

const Operation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);

  const onFinish = (values: any) => {
    const scheduledDateTime =
      dayjs(values.date).format("YYYY-MM-DD") +
      " " +
      dayjs(values.time).format("HH:mm:ss");
    message.success(`Session scheduled for ${scheduledDateTime}`);
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

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Operation Control
        </Title>
      </div>
      
      <Content style={{ padding: '20px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <ClockCircleOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                Schedule Session
              </Title>
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
                    Schedule
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Col>

          <Col span={24}>
            <div style={{ 
              background: '#fff', 
              padding: '24px', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <ThunderboltOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Manual Trigger
              </Title>
              <Row gutter={16}>
                <Col>
                  <Button 
                    type="primary" 
                    onClick={handleManualTrigger} 
                    loading={loading}
                    size="large"
                  >
                    Run Cleaning
                  </Button>
                </Col>
                <Col>
                  <Button 
                    type="primary" 
                    onClick={handleManualTriggerExtract} 
                    loading={extractLoading}
                    size="large"
                  >
                    Run Extract
                  </Button>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Operation; 