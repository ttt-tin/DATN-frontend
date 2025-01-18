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
} from "antd";
import { PlusOutlined, UploadOutlined, CloudOutlined } from "@ant-design/icons";
import {
  createVolume,
  executeAthenaQuery,
  fetchTables,
  handleFileUpload,
  connectToExternalStorage,
  insertMetadataToInternalS3,
} from "../utils/athenaUtil.ts";
import DownloadFile from "./downloadFileButton.tsx";

const Volume: React.FC = () => {
  const [error, setError] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateVolumeModalOpen, setIsCreateVolumeModalOpen] = useState(false);
  const [isCreateExternalVolumeModalOpen, setIsCreateExternalVolumeModalOpen] =
    useState(false);
  const [newVolumeName, setNewVolumeName] = useState("");
  const [externalConnectionInfo, setExternalConnectionInfo] = useState({
    provider: "",
    bucketName: "",
    accessKey: "",
    secretKey: "",
    sasToken: "",
    sasUrl: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchTables(
          "AwsDataCatalog",
          "unstructured-metadata-db"
        );
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
      const query = `SELECT * FROM ${tableName} LIMIT 100`;
      const data = await executeAthenaQuery(
        "AwsDataCatalog",
        "unstructured-metadata-db",
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
              <DownloadFile objectKey={record["object"]} />
            ),
          },
        ]);
        setRecords(data);
      } else {
        setColumns([]);
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching table data:", err);
      message.error("Failed to fetch table data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVolume = async () => {
    try {
      await createVolume("bk-health-landing-bucket", newVolumeName);
      setIsCreateVolumeModalOpen(false);
      setNewVolumeName("");
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleFileUploadWrapper = async ({ file }: { file: File }) => {
    if (!selectedTable) {
      message.error("Please select a volume first.");
      return;
    }

    try {
      await handleFileUpload("bk-health-landing-bucket", selectedTable, file);
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleCreateExternalVolume = async () => {
    try {
      // Connect to the external storage
      const fileMetadata = await connectToExternalStorage(
        externalConnectionInfo
      );

      // Ensure that fileMetadata contains size as a number and lastModified is always a Date
      const normalizedFileMetadata = fileMetadata.map((file) => ({
        ...file,
        size: file.size ?? 0, // Fallback to 0 if size is undefined
        lastModified: file.lastModified ?? new Date(), // Fallback to the current date if lastModified is undefined
      }));
      
      const newVolumeName = externalConnectionInfo.bucketName ? externalConnectionInfo.bucketName : externalConnectionInfo.containerName

      // Create a new volume in internal S3
      await createVolume(
        "bk-health-landing-bucket",
        newVolumeName
      );

      // Insert metadata into internal S3
      await insertMetadataToInternalS3(
        "bk-health-landing-bucket",
        newVolumeName,
        normalizedFileMetadata
      );

      message.success("External volume created and metadata inserted.");
      setIsCreateExternalVolumeModalOpen(false);
      setExternalConnectionInfo({
        provider: "",
        bucketName: "",
        accessKey: "",
        secretKey: "",
        containerName: "",
        sasToken: "",
        sasUrl: "",
      });
    } catch (err) {
      console.error("Error creating external volume:", err);
      message.error("Failed to create external volume.");
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Volume Explorer</h2>
      <div style={{ marginBottom: "16px" }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateVolumeModalOpen(true)}
          style={{ marginRight: "8px" }}
        >
          New Volume
        </Button>
        <Button
          type="dashed"
          icon={<CloudOutlined />}
          onClick={() => setIsCreateExternalVolumeModalOpen(true)}
          style={{ marginRight: "8px" }}
        >
          Create External Volume
        </Button>
        <Upload
          customRequest={handleFileUploadWrapper}
          showUploadList={false}
          disabled={!selectedTable}
        >
          <Button icon={<UploadOutlined />} disabled={!selectedTable}>
            Upload File
          </Button>
        </Upload>
      </div>
      <Select
        placeholder="Select Table"
        style={{ width: "100%", marginBottom: "16px" }}
        options={tables.map((table) => ({
          label: table,
          value: table,
        }))}
        onChange={handleTableSelect}
        value={selectedTable}
      />
      {loading ? (
        <Spin style={{ display: "block", margin: "0 auto" }} />
      ) : (
        <Table
          columns={columns}
          dataSource={records}
          rowKey={(record) => JSON.stringify(record)}
          pagination={{ pageSize: 10 }}
        />
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Modal for creating a new volume */}
      <Modal
        title="Create New Volume"
        visible={isCreateVolumeModalOpen}
        onOk={handleCreateVolume}
        onCancel={() => setIsCreateVolumeModalOpen(false)}
      >
        <Input
          placeholder="Enter volume name"
          value={newVolumeName}
          onChange={(e) => setNewVolumeName(e.target.value)}
        />
      </Modal>

      <Modal
        title="Connect to External Storage"
        visible={isCreateExternalVolumeModalOpen}
        onOk={handleCreateExternalVolume}
        onCancel={() => setIsCreateExternalVolumeModalOpen(false)}
      >
        <Form layout="vertical">
          <Form.Item label="Provider">
            <Select
              placeholder="Select a provider"
              value={externalConnectionInfo.provider}
              onChange={(value) =>
                setExternalConnectionInfo({
                  ...externalConnectionInfo,
                  provider: value,
                })
              }
              options={[
                { label: "AWS S3", value: "AWS S3" },
                { label: "Azure Blob", value: "Azure Blob" },
              ]}
            />
          </Form.Item>

          {externalConnectionInfo.provider === "AWS S3" && (
            <>
              <Form.Item label="Bucket Name">
                <Input
                  placeholder="Enter bucket name"
                  value={externalConnectionInfo.bucketName}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      bucketName: e.target.value,
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Access Key">
                <Input
                  placeholder="Enter access key"
                  value={externalConnectionInfo.accessKey}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      accessKey: e.target.value,
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Secret Key">
                <Input.Password
                  placeholder="Enter secret key"
                  value={externalConnectionInfo.secretKey}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      secretKey: e.target.value,
                    })
                  }
                />
              </Form.Item>
            </>
          )}

          {externalConnectionInfo.provider === "Azure Blob" && (
            <>
              <Form.Item label="Container Name">
                <Input
                  placeholder="Enter container name"
                  value={externalConnectionInfo.containerName}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      containerName: e.target.value,
                    })
                  }
                />
              </Form.Item>

              <Form.Item label="SAS Token">
                <Input.Password
                  placeholder="Enter SAS token"
                  value={externalConnectionInfo.sasToken}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      sasToken: e.target.value,
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="SAS URL">
                <Input
                  placeholder="Enter SAS URL"
                  value={externalConnectionInfo.sasUrl}
                  onChange={(e) =>
                    setExternalConnectionInfo({
                      ...externalConnectionInfo,
                      sasUrl: e.target.value,
                    })
                  }
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Volume;
