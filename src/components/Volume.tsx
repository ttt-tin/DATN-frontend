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
  connectToExternalStorage,
  createVolume,
  executeAthenaQuery,
  fetchTables,
  handleFileUpload,
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
  
    // Check if the table is an external volume
    const isExternalVolume = selectedTable.endsWith("_external_volume_table");
  
    if (isExternalVolume) {
      setIsUploadFileModalOpen(true);
      return;
    }

    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL +
          `/athena/metadata?table_name=patient_repaired`
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

  // Check if the table is an external volume
  const isExternalVolume = selectedTable.endsWith("_external_volume_table");

  try {
    const formData = new FormData();
    formData.append("file", fileToUpload);

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

      // Append additional fields
      Object.keys(uploadInfo).forEach((key) => {
        if (uploadInfo[key].trim() !== "") {
          formData.append(key, uploadInfo[key]);
        }
      });

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
  } catch (err) {
    console.error("Error uploading file:", err);
    message.error(err.message || "Failed to upload file.");
  }
};

  const handleCreateVolume = async () => {
    try {
      await createVolume("bk-health-bucket-landing", newVolumeName);
      message.success("Volume created successfully.");
      setIsCreateVolumeModalOpen(false);
      setNewVolumeName("");
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
        <Button
          icon={<UploadOutlined />}
          onClick={handleUploadButtonClick}
          disabled={!selectedTable}
        >
          Upload File
        </Button>
      </div>
      <Select
        placeholder="Select Table"
        style={{ width: "100%", marginBottom: "16px" }}
        options={tables.map((table) => ({ label: table, value: table }))}
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
        title="Create External Volume"
        visible={isCreateExternalVolumeModalOpen}
        onOk={handleCreateExternalVolume}
        onCancel={() => setIsCreateExternalVolumeModalOpen(false)}
      >
        <Input
          placeholder="Enter volume name"
          value={newVolumeName}
          onChange={(e) => setNewVolumeName(e.target.value)}
          style={{ marginTop: "16px" }}
        />
        <Input
          placeholder="Azure Container Name"
          value={azureContainer}
          onChange={(e) => setAzureContainer(e.target.value)}
          style={{ marginTop: "16px" }}
        />
        <Input
          placeholder="Azure Connection String"
          value={azureConnectionString}
          onChange={(e) => setAzureConnectionString(e.target.value)}
          style={{ marginTop: "16px" }}
        />
      </Modal>

      <Modal
        title="Upload File"
        visible={isUploadFileModalOpen}
        onOk={handleFileUploadWrapper}
        onCancel={() => setIsUploadFileModalOpen(false)}
      >
        <Upload
          beforeUpload={(file) => {
            setFileToUpload(file);
            return false;
          }}
          showUploadList={true}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        {uploadFields.map((field) => (
          <Input
            key={field}
            placeholder={`Enter ${field}`}
            value={uploadInfo[field]}
            onChange={(e) =>
              setUploadInfo({ ...uploadInfo, [field]: e.target.value })
            }
            style={{ marginTop: "16px" }}
          />
        ))}
      </Modal>
    </div>
  );
};

export default Volume;
