import React, { useEffect, useState } from "react";
import {
  Button,
  Select,
  Table,
  Spin,
  message,
  Modal,
  Input,
  Upload,
  Form,
  Typography,
  Checkbox,
  Tag,
  Layout,
  Card,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  CloudOutlined,
  FolderOutlined,
  FileOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  connectToExternalStorage,
  createVolume,
  executeAthenaQuery,
  fetchTables,
  handleFileUpload,
  insertMetadataToInternalS3,
} from "../utils/athenaUtil.ts";
import DownloadFile from "./downloadFileButton.tsx";

const { Title } = Typography;
const { Content } = Layout;

const Volume: React.FC = () => {
  const [error, setError] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploadFileModalOpen, setIsUploadFileModalOpen] = useState(false);
  const [uploadFields, setUploadFields] = useState<string[]>([]);
  const [azureContainer, setAzureContainer] = useState("");
  const [azureConnectionString, setAzureConnectionString] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isCreateVolumeModalOpen, setIsCreateVolumeModalOpen] = useState(false);
  const [isCreateExternalVolumeModalOpen, setIsCreateExternalVolumeModalOpen] =
    useState(false);
  const [newVolumeName, setNewVolumeName] = useState("");
  const [uploadInfo, setUploadInfo] = useState({
    description: "",
    patientId: "",
  });
  const [isTextData, setIsTextData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchTables("AwsDataCatalog", "metadata-db");
        setTables(data);
      } catch (err) {
        console.error("Error fetching tables:", err);
        setError("Failed to fetch tables.");
      }
    };
    fetchData();
  }, []);

  const handleTableSelect = async (tableName: string) => {
    setLoading(true);
    setSelectedTable(tableName);

    try {
      if (tableName.endsWith("_external_volume_table")) {
        // 🔹 Call external volume API
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/external-volume/files/${tableName}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch external volume data."
          );
        }

        if (data.length > 0) {
          const columnNames = Object.keys(data[0]);
          setColumns([
            ...columnNames.map((name) => ({
              title: name,
              dataIndex: name,
              key: name,
            })),
            {
              title: "Actions",
              key: "actions",
              render: (_, record) => (
                <DownloadFile objectKey={record.file_path} />
              ),
            },
          ]);
          setRecords(data);
        } else {
          setColumns([]);
          setRecords([]);
        }
      } else {
        // 🔹 Fetch from Athena as before
        const query = `SELECT * FROM ${tableName} LIMIT 100`;
        const data = await executeAthenaQuery(
          "AwsDataCatalog",
          "metadata-db",
          query
        );

        if (data.length > 0) {
          const columnNames = Object.keys(data[0]);
          setColumns([
            ...columnNames.map((name) => ({
              title: name,
              dataIndex: name,
              key: name,
            })),
            {
              title: "Actions",
              key: "actions",
              render: (_, record) => (
                <DownloadFile
                  objectKey={
                    "unstructure/" +
                    tableName.replace(/_volume_table$/, "") +
                    "/" +
                    record["file_name"]
                  }
                />
              ),
            },
          ]);
          setRecords(data);
        } else {
          setColumns([]);
          setRecords([]);
        }
      }
    } catch (err) {
      console.error("Error fetching table data:", err);
      message.error("Failed to fetch table data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadButtonClick = async () => {
    if (!selectedTable) {
      message.error("Please select a volume first.");
      return;
    }
  
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL +
          `/athena/metadata?table_name=patient`
      );
      const metadata = await response.json();
      const columns = metadata.column_name.split(",");
      setUploadFields([...columns, "patient_id"]);
      setUploadInfo(
        columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {
          patient_id: "",
        })
      );
      setIsUploadFileModalOpen(true);
    } catch (err) {
      console.error("Error fetching metadata:", err);
      message.error("Failed to fetch metadata.");
    }
  };

  const handleFileUploadWrapper = async () => {
    if (!selectedTable || !fileToUpload) {
      message.error("Please select a volume and a file.");
      return;
    }

    setLoading(true);
    // Check if the table is an external volume
    const isExternalVolume = selectedTable.endsWith("_external_volume_table");

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Append additional fields for both external and normal volume
      Object.keys(uploadInfo).forEach((key) => {
        if (uploadInfo[key].trim() !== "") {
          formData.append(key, uploadInfo[key]);
        }
      });

      if (isExternalVolume) {
        // Call external storage upload API
        const response = await fetch(
          process.env.REACT_APP_API_URL + `/external-volume/upload/${selectedTable}`,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "File upload to external storage failed.");
        }

        message.success("File uploaded successfully to external storage.");
      } else {
        // Standard upload process
        formData.append("volume", selectedTable);

        const response = await fetch(
          process.env.REACT_APP_API_URL + "/upload/upload-file",
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "File upload failed.");
        }

        message.success("File uploaded successfully.");
      }

      // Reset modal and file states
      setIsUploadFileModalOpen(false);
      setFileToUpload(null);
      setUploadInfo({ patient_id: "" });
      
      // Refresh the data
      await reloadData();
    } catch (err) {
      console.error("Error uploading file:", err);
      message.error(err.message || "Failed to upload file.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVolume = async () => {
    try {
      const volumeName = isTextData ? `${newVolumeName}_text_data` : newVolumeName;
      await createVolume("bk-health-bucket-landing", volumeName);
      message.success("Volume created successfully.");
      setIsCreateVolumeModalOpen(false);
      setNewVolumeName("");
      setIsTextData(false);
    } catch (err) {
      console.error("Error creating volume:", err);
      message.error("Failed to create volume.");
    }
  };

  const handleCreateExternalVolume = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/external-volume/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volumeName: newVolumeName,
            containerName: azureContainer,
            connectionString: azureConnectionString,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create external volume.");
      }

      message.success("External volume created successfully.");
      setIsCreateExternalVolumeModalOpen(false);
    } catch (error) {
      console.error("Error creating external volume:", error);
      message.error(error.message);
    }
  };

  const reloadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTables("AwsDataCatalog", "metadata-db");
      setTables(data);
      if (selectedTable) {
        await handleTableSelect(selectedTable);
      }
      message.success("Data refreshed successfully");
    } catch (err) {
      console.error("Error refreshing data:", err);
      message.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          <FolderOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Volume Management
        </Title>
      </div>
      
      <Content style={{ padding: '20px' }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsCreateVolumeModalOpen(true)}
                disabled={loading}
              >
                Create Volume
              </Button>
              <Button 
                type="primary" 
                icon={<CloudOutlined />}
                onClick={() => setIsCreateExternalVolumeModalOpen(true)}
                disabled={loading}
              >
                Create External Volume
              </Button>
              <Button 
                type="primary" 
                icon={<UploadOutlined />}
                onClick={() => {handleUploadButtonClick()}}
                disabled={loading}
              >
                Upload File
              </Button>
            </div>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={reloadData}
              loading={loading}
            >
              Refresh
            </Button>
          </div>

          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <Select
              placeholder="Select Table"
              style={{ width: "100%", marginBottom: "16px" }}
              options={tables.map((table) => {
                let displayName = table;
                let tags: React.ReactNode[] = [];

                if (table.endsWith("_external_volume_table")) {
                  displayName = displayName.replace("_external_volume_table", "");
                  tags.push(
                    <Tag color="green" key="external" style={{ marginLeft: 8 }}>
                      External
                    </Tag>
                  );
                } 
                else if (table.endsWith("_volume_table")) {
                  displayName = displayName.replace("_volume_table", "");
                }

                if (displayName.endsWith("_text_data")) {
                  displayName = displayName.replace("_text_data", "");
                  tags.push(
                    <Tag color="blue" key="text-data" style={{ marginLeft: 8 }}>
                      Text Data
                    </Tag>
                  );
                }

                return {
                  label: (
                    <span>
                      {displayName}
                      {tags}
                    </span>
                  ),
                  value: table,
                };
              })}
              onChange={handleTableSelect}
              value={selectedTable}
              disabled={loading}
            />
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="large" />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={records}
                rowKey={(record) => JSON.stringify(record)}
                pagination={{ pageSize: 10 }}
                size="middle"
                bordered
              />
            )}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </Card>
        </div>
      </Content>

      <Modal
        title="Create New Volume"
        visible={isCreateVolumeModalOpen}
        onOk={handleCreateVolume}
        onCancel={() => {
          setIsCreateVolumeModalOpen(false);
          setNewVolumeName("");
          setIsTextData(false);
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Volume Name" required>
            <Input
              placeholder="Enter volume name"
              value={newVolumeName}
              onChange={(e) => setNewVolumeName(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={isTextData}
              onChange={(e) => setIsTextData(e.target.checked)}
            >
              This is a text data volume
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create External Volume"
        visible={isCreateExternalVolumeModalOpen}
        onOk={handleCreateExternalVolume}
        onCancel={() => setIsCreateExternalVolumeModalOpen(false)}
      >
        <Form layout="vertical">
          <Form.Item label="Volume Name" required>
            <Input
              placeholder="Enter volume name"
              value={newVolumeName}
              onChange={(e) => setNewVolumeName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Azure Container Name" required>
            <Input
              placeholder="Azure Container Name"
              value={azureContainer}
              onChange={(e) => setAzureContainer(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Azure Connection String" required>
            <Input
              placeholder="Azure Connection String"
              value={azureConnectionString}
              onChange={(e) => setAzureConnectionString(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Upload File"
        visible={isUploadFileModalOpen}
        onOk={handleFileUploadWrapper}
        onCancel={() => setIsUploadFileModalOpen(false)}
        confirmLoading={loading}
      >
        <Upload
          beforeUpload={(file) => {
            setFileToUpload(file);
            return false;
          }}
          showUploadList={true}
          disabled={loading}
        >
          <Button icon={<UploadOutlined />} disabled={loading}>Select File</Button>
        </Upload>
        {uploadFields.map((field) => (
          <Form.Item key={field} label={field} required>
            <Input
              placeholder={`Enter ${field}`}
              value={uploadInfo[field]}
              onChange={(e) =>
                setUploadInfo({ ...uploadInfo, [field]: e.target.value })
              }
              disabled={loading}
            />
          </Form.Item>
        ))}
      </Modal>
    </Layout>
  );
};

export default Volume;
