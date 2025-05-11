import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Card,
  Col,
  Row,
  Modal,
  Popconfirm,
  message,
  Typography,
  Space,
  Layout,
} from "antd";
import {
  DeleteOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { Title } = Typography;
const { Content } = Layout;

interface DataSourceItem {
  id: number;
  name: string;
  dataType: "batch" | "streaming" | null;
  fileType: "csv" | "json" | "parquet" | null;
  path: string;
}

const DataSource: React.FC = () => {
  const [form] = Form.useForm();
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedDataSource, setSelectedDataSource] =
    useState<DataSourceItem | null>(null);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + "/data-sources",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch data sources");

      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      message.error("Error fetching data sources: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: {
    name: string;
    dataType: string;
    fileType: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + "/data-sources",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) throw new Error("Failed to save data source");

      message.success("Data source saved successfully!");
      form.resetFields();
      setIsCreateModalVisible(false);
      await fetchDataSources();
    } catch (error) {
      message.error("Error saving data source: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/data-sources/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete data source");

      message.success("Data source deleted successfully!");
      await fetchDataSources();
    } catch (error) {
      message.error("Error deleting data source: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showDetails = (dataSource: DataSourceItem) => {
    setSelectedDataSource(dataSource);
    setIsDetailsModalVisible(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalVisible(false);
    setSelectedDataSource(null);
  };

  const showCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalVisible(false);
    form.resetFields();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Data Sources
        </Title>
      </div>
      
      <Content style={{ padding: '20px' }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
            >
              Create Data Source
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            {dataSources.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <Card
                  hoverable
                  onClick={() => showDetails(item)}
                  actions={[
                    <div onClick={(e) => e.stopPropagation()}>
                      <Popconfirm
                        title="Are you sure to delete this data source?"
                        onConfirm={() => handleDelete(item.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <DeleteOutlined key="delete" />
                      </Popconfirm>
                    </div>,
                  ]}
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <Card.Meta
                    avatar={
                      item.dataType === "batch" ? (
                        <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                      ) : item.dataType === "streaming" ? (
                        <ThunderboltOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                      ) : (
                        <DatabaseOutlined style={{ fontSize: '24px', color: '#8c8c8c' }} />
                      )
                    }
                    title={item.name}
                    description={
                      <div>
                        <div>Type: {item.dataType ? (item.dataType === "batch" ? "Batch Processing" : "Streaming") : "Not specified"}</div>
                        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '12px' }}>
                          Path: {item.path}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>

      <Modal
        title="Create Data Source"
        open={isCreateModalVisible}
        onCancel={handleCreateModalClose}
        footer={null}
      >
        <Form
          form={form}
          name="data_source_form"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          initialValues={{ name: "", dataType: "", fileType: "" }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Name" />
          </Form.Item>
          <Form.Item
            label="Data Type"
            name="dataType"
            rules={[{ required: true, message: "Data type is required" }]}
          >
            <Select placeholder="Data Type">
              <Option value="batch">Batch Processing</Option>
              <Option value="streaming">Streaming</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="File Type"
            name="fileType"
            rules={[{ required: true, message: "File type is required" }]}
          >
            <Select placeholder="File Type">
              <Option value="csv">CSV</Option>
              <Option value="json">JSON</Option>
              <Option value="parquet">Parquet</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Submit
              </Button>
              <Button onClick={handleCreateModalClose}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Data Source Details"
        open={isDetailsModalVisible}
        onCancel={handleDetailsModalClose}
        footer={[
          <Button key="close" onClick={handleDetailsModalClose}>
            Close
          </Button>,
        ]}
      >
        {selectedDataSource && (
          <div>
            <p>
              <strong>Name:</strong> {selectedDataSource.name}
            </p>
            <p>
              <strong>Data Type:</strong>{" "}
              {selectedDataSource.dataType ? (selectedDataSource.dataType === "batch"
                ? "Batch Processing"
                : "Streaming") : "Not specified"}
            </p>
            <p>
              <strong>File Type:</strong>{" "}
              {selectedDataSource.fileType ? selectedDataSource.fileType.toUpperCase() : "Not specified"}
            </p>
            <p>
              <strong>Path:</strong>{" "}
              <span style={{ color: '#8c8c8c' }}>{selectedDataSource.path}</span>
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default DataSource;
