import React, { useState, useEffect } from "react";
import { Tree, Spin, message, Table, Typography, Card, Layout, Menu, Tabs, Statistic, Row, Col } from "antd";
import type { DataNode } from "antd/es/tree";
import { 
  DownOutlined, 
  FolderOutlined, 
  FileOutlined,
  DatabaseOutlined,
  TableOutlined,
  CloudOutlined,
  FileTextOutlined,
  InboxOutlined,
  CloudUploadOutlined
} from "@ant-design/icons";
import axios from "axios";
import dayjs from 'dayjs';

const { Title } = Typography;
const { Sider, Content } = Layout;
const { TabPane } = Tabs;

interface SchemaField {
  name: string;
  type: string;
}

interface UnstructuredInfo {
  totalSize: string;
  fileCount: number;
  type: string;
  createDate: string;
  lastUpdated: string;
}

interface BucketInfo {
  bucketName: string;
  totalFiles: number;
  totalSize: string;
  lastModified: string;
  fileTypeDistribution: {
    type: string;
    count: number;
    percentage: string;
  }[];
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const Explorer: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<SchemaField[]>([]);
  const [unstructuredInfo, setUnstructuredInfo] =
    useState<UnstructuredInfo | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [rawDataInfo, setRawDataInfo] = useState<BucketInfo | null>(null);
  const [landingDataInfo, setLandingDataInfo] = useState<BucketInfo | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const structureRes = await axios.get(
          API_URL + "/explorer/tables/hospital_data"
        );

        const unstructureRes = await axios.get(
          API_URL + "/explorer/tables/metadata-db"
        );

        // Filter and process structure tables
        const structureTables = structureRes.data
          .map((table: string) => ({
            title: table.replace("_repaired", ""),
            key: `structure-${table}`,
            isLeaf: true,
            database: "hospital_data",
            originalName: table,
          }));

        // Process unstructure tables
        const unstructureTables = unstructureRes.data.map((table: string) => {
          let displayName = table;
          if (table.endsWith("_volume_table")) {
            displayName = table.replace("_volume_table", "");
          } else if (table.endsWith("_external_volume_table")) {
            displayName = table.replace("_external_volume_table", "");
          }
          return {
            title: displayName,
            key: `unstructure-${table}`,
            isLeaf: true,
            database: "metadata-db",
            originalName: table,
          };
        });

        // Add Raw Data and Landing Data nodes
        setTreeData([
          { 
            title: "Structure", 
            key: "structure", 
            children: structureTables,
            icon: <DatabaseOutlined style={{ color: '#1890ff' }} />
          },
          {
            title: "Unstructure",
            key: "unstructure",
            children: unstructureTables,
            icon: <FolderOutlined style={{ color: '#52c41a' }} />
          },
          {
            title: "Raw Data",
            key: "raw-data",
            isLeaf: true,
            icon: <InboxOutlined style={{ color: '#722ed1' }} />
          },
          {
            title: "Landing Data",
            key: "landing-data",
            isLeaf: true,
            icon: <CloudUploadOutlined style={{ color: '#fa8c16' }} />
          }
        ]);
      } catch (error) {
        message.error("Failed to fetch tables.");
        console.error("Error fetching tables:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  useEffect(() => {
    fetchBucketInfo();
  }, []);

  const fetchBucketInfo = async () => {
    setLoading(true);
    try {
      const [rawResponse, landingResponse] = await Promise.all([
        axios.get(`${API_URL}/explorer/bucket-info/bk-health-bucket-raw`),
        axios.get(`${API_URL}/explorer/bucket-info/bk-health-bucket-landing`)
      ]);
      
      if (rawResponse.data.status === 'success' && landingResponse.data.status === 'success') {
        setRawDataInfo(rawResponse.data.data);
        setLandingDataInfo(landingResponse.data.data);
      } else {
        message.error('Failed to fetch bucket information');
      }
    } catch (error) {
      console.error('Error fetching bucket info:', error);
      message.error('Failed to fetch bucket information');
    } finally {
      setLoading(false);
    }
  };

  const onSelect = async (selectedKeys: React.Key[], info: any) => {
    if (info.node.isLeaf) {
      if (info.node.key === 'raw-data') {
        setSelectedTable('Raw Data');
        setSchemaLoading(true);
        try {
          const response = await axios.get(`${API_URL}/explorer/bucket-info/bk-health-bucket-raw`);
          if (response.data.status === 'success') {
            setRawDataInfo(response.data.data);
          }
        } catch (error) {
          message.error('Failed to fetch Raw Data information');
        } finally {
          setSchemaLoading(false);
        }
      } else if (info.node.key === 'landing-data') {
        setSelectedTable('Landing Data');
        setSchemaLoading(true);
        try {
          const response = await axios.get(`${API_URL}/explorer/bucket-info/bk-health-bucket-landing`);
          if (response.data.status === 'success') {
            setLandingDataInfo(response.data.data);
          }
        } catch (error) {
          message.error('Failed to fetch Landing Data information');
        } finally {
          setSchemaLoading(false);
        }
      } else {
        const originalTableName = info.node.originalName;
        const displayTableName = info.node.title;
        setSelectedTable(displayTableName);
        setSchemaLoading(true);
        setTableSchema([]);
        setUnstructuredInfo(null);

        try {
          const res = await axios.get(
            API_URL + `/explorer/table-info/${info.node.database}/${originalTableName}`
          );

          if (info.node.database === "hospital_data") {
            setTableSchema(res.data);
          } else {
            setUnstructuredInfo(res.data);
          }
        } catch (error) {
          message.error("Failed to fetch data.");
          console.error("Error fetching data:", error);
        } finally {
          setSchemaLoading(false);
        }
      }
    }
  };

  const getIcon = (node: any) => {
    if (node.key === 'structure' || node.key === 'unstructure') {
      return <DatabaseOutlined style={{ color: '#1890ff' }} />;
    }
    if (node.originalName?.endsWith('_external_volume_table')) {
      return <CloudOutlined style={{ color: '#52c41a' }} />;
    }
    return <TableOutlined style={{ color: '#722ed1' }} />;
  };

  const renderTreeNodes = (data: DataNode[]) => {
    return data.map((item) => {
      if (item.children) {
        return {
          ...item,
          icon: getIcon(item),
          children: renderTreeNodes(item.children),
        };
      }
      return {
        ...item,
        icon: getIcon(item),
      };
    });
  };

  const renderBucketInfo = (info: BucketInfo | null) => {
    if (!info) return <Spin />;

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div className="ant-card">
              <Statistic
                title="Total Files"
                value={info.totalFiles}
                prefix={<FileTextOutlined />}
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="ant-card">
              <Statistic
                title="Total Size"
                value={info.totalSize}
                prefix={<CloudOutlined />}
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="ant-card">
              <Statistic
                title="Last Modified"
                value={dayjs(info.lastModified).format('YYYY-MM-DD HH:mm:ss')}
              />
            </div>
          </Col>
        </Row>

        <div className="ant-card" style={{ marginTop: 16 }}>
          <Title level={5}>File Type Distribution</Title>
          <Table
            dataSource={info.fileTypeDistribution}
            columns={[
              {
                title: 'File Type',
                dataIndex: 'type',
                key: 'type',
              },
              {
                title: 'Count',
                dataIndex: 'count',
                key: 'count',
              },
              {
                title: 'Percentage',
                dataIndex: 'percentage',
                key: 'percentage',
                render: (value) => `${value}%`,
              },
            ]}
            pagination={false}
          />
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          Data Explorer
        </Title>
      </div>
      
      <Layout style={{ padding: '20px', background: '#f0f2f5' }}>
        <Sider 
          width={300} 
          style={{ 
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '16px',
            marginRight: '20px'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin size="large" />
            </div>
          ) : (
            <Tree
              showIcon
              switcherIcon={<DownOutlined />}
              treeData={treeData}
              onSelect={onSelect}
              style={{
                background: '#fff',
                padding: '10px',
                borderRadius: '5px',
                height: '100%',
                overflow: 'auto',
              }}
            />
          )}
        </Sider>

        <Content style={{ 
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '24px',
          minHeight: '500px'
        }}>
          {schemaLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin size="large" />
            </div>
          ) : selectedTable ? (
            <div>
              {selectedTable === 'Raw Data' ? (
                renderBucketInfo(rawDataInfo)
              ) : selectedTable === 'Landing Data' ? (
                renderBucketInfo(landingDataInfo)
              ) : (
                <div className="ant-card">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <FileOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    <Title level={4} style={{ margin: 0 }}>Details for {selectedTable}</Title>
                  </div>
                  {unstructuredInfo ? (
                    <Table
                      dataSource={[
                        {
                          key: "Total Storage Size",
                          value: unstructuredInfo.totalSize,
                        },
                        { key: "File Count", value: unstructuredInfo.fileCount },
                        { key: "Type", value: unstructuredInfo.type },
                        {
                          key: "Last Updated Date",
                          value: unstructuredInfo.lastUpdated,
                        },
                        { key: "Region", value: unstructuredInfo.awsRegion },
                        { key: "URI", value: unstructuredInfo.folderUri },
                      ]}
                      columns={[
                        { 
                          title: "Property", 
                          dataIndex: "key", 
                          key: "key",
                          width: '30%',
                          render: (text) => (
                            <span style={{ fontWeight: 500, color: '#595959' }}>{text}</span>
                          )
                        },
                        { 
                          title: "Value", 
                          dataIndex: "value", 
                          key: "value",
                          render: (text) => (
                            <span style={{ color: '#262626' }}>{text}</span>
                          )
                        },
                      ]}
                      pagination={false}
                      showHeader={false}
                      size="middle"
                    />
                  ) : (
                    <Table
                      dataSource={tableSchema.map((field) => ({
                        key: field.name,
                        name: field.name,
                        type: field.type,
                      }))}
                      columns={[
                        { 
                          title: "Field Name", 
                          dataIndex: "name", 
                          key: "name",
                          render: (text) => (
                            <span style={{ fontWeight: 500, color: '#595959' }}>{text}</span>
                          )
                        },
                        { 
                          title: "Type", 
                          dataIndex: "type", 
                          key: "type",
                          render: (text) => (
                            <span style={{ color: '#262626' }}>{text}</span>
                          )
                        },
                      ]}
                      pagination={false}
                      size="middle"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#8c8c8c', 
              fontSize: '16px',
              padding: '40px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px dashed #d9d9d9'
            }}>
              <FolderOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#bfbfbf' }} />
              <p>Select a table to view its details</p>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Explorer;
