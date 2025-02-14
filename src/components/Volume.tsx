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
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isCreateVolumeModalOpen, setIsCreateVolumeModalOpen] = useState(false);
  const [isCreateExternalVolumeModalOpen, setIsCreateExternalVolumeModalOpen] = useState(false);
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
              <DownloadFile objectKey={"unstructure/" + tableName.replace(/_volume_table$/, "") + "/" + record["file_name"]} />
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

  const handleUploadButtonClick = async () => {
    if (!selectedTable) {
      message.error("Please select a volume first.");
      return;
    }
    try {
      const response = await fetch(process.env.REACT_APP_API_URL + `/athena/metadata?table_name=patient_repaired`);
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
    if (!Object.values(uploadInfo).some((value) => value.trim() !== "")) {
      message.error("Please fill at least one field.");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("volume", selectedTable);
  
      // Append additional fields
      Object.keys(uploadInfo).forEach((key) => {
        if (uploadInfo[key].trim() !== "") {
          formData.append(key, uploadInfo[key]);
        }
      });
  
      const response = await fetch(process.env.REACT_APP_API_URL + "/upload/upload-file", {
        method: "POST",
        body: formData,
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.message || "File upload failed.");
      }
  
      message.success("File uploaded successfully.");
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
