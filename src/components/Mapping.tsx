import React, { useState, useEffect } from "react";
import {
  AthenaClient,
  ListDataCatalogsCommand,
  ListDatabasesCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
} from "@aws-sdk/client-athena";
import {
  Select,
  Button,
  Input,
  Table,
  message,
  Typography,
  Modal,
  Upload,
} from "antd";
// Removed incorrect import for Option
import "./Mapping.css";
import mappingServiceInstance from "../services/mapping.ts";
import { UploadOutlined } from "@ant-design/icons";
import schemaInstance from "../services/schema-define.ts";

const { Title } = Typography;

const Mapping: React.FC = () => {
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<{ Name: string; Type: string }[]>([]);
  const [mappings, setMappings] = useState<
    { source: string; target: string }[]
  >([]);
  const [databaseStograte, setDatabaseStograte] = useState<string[]>([]);
  const [tableStograte, setTableStograte] = useState<string[]>([]);
  const [selectDatabaseStograte, setSelectDatabaseStograte] =
    useState<string>();
  const [selectTableMapping, setSelectTableMapping] = useState<string>();

  useEffect(() => {
    const fetchDatabaseStograte = async () => {
      try {
        const response = await schemaInstance.getsSchema();
        console.log("Database stograte:", response);
        setDatabaseStograte(response);
      } catch (error) {
        console.error("Error fetching database stograte:", error);
      }
    };

    fetchDatabaseStograte();
  }, []);

  useEffect(() => {
    const fetchColumnStograte = async () => {
      try {
        const response = await schemaInstance.getsTable(
          selectDatabaseStograte
        );
        console.log("Column stograte:", response);
        setTableStograte(response);
      } catch (error) {
        console.error("Error fetching Column stograte:", error);
      }
    };

    fetchColumnStograte();
  }, [selectDatabaseStograte]);

  useEffect(() => {
    console.log("tableStograte", tableStograte);
  }, [tableStograte]);

  const [selectedCatalog, setSelectedCatalog] = useState<string>("");
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const athenaClient = new AthenaClient({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
    },
  });

  // Fetch catalogs
  const fetchCatalogs = async () => {
    try {
      const command = new ListDataCatalogsCommand({});
      const response = await athenaClient.send(command);
      setCatalogs(
        response.DataCatalogsSummary?.map((catalog) => catalog.CatalogName!) ||
          []
      );
    } catch (err: any) {
      console.error("Error fetching catalogs:", err);
      setError(err.message || "Failed to fetch catalogs.");
    }
  };

  // Fetch databases
  const fetchDatabases = async () => {
    if (!selectedCatalog) return;
    try {
      const command = new ListDatabasesCommand({
        CatalogName: selectedCatalog,
      });
      const response = await athenaClient.send(command);
      setDatabases(response.DatabaseList?.map((db) => db.Name!) || []);
    } catch (err: any) {
      console.error("Error fetching databases:", err);
      setError(err.message || "Failed to fetch databases.");
    }
  };

  // Fetch tables
  const fetchTables = async () => {
    if (!selectedCatalog || !selectedDatabase) return;
    try {
      const command = new ListTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
      });
      const response = await athenaClient.send(command);
      setTables(response.TableMetadataList?.map((table) => table.Name!) || []);
    } catch (err: any) {
      console.error("Error fetching tables:", err);
      setError(err.message || "Failed to fetch tables.");
    }
  };

  // Fetch schema
  const fetchSchema = async () => {
    if (!selectedCatalog || !selectedDatabase || !selectedTable) return;
    try {
      const command = new GetTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
        TableName: selectedTable,
      });
      const response = await athenaClient.send(command);
      const columns = response.TableMetadata?.Columns || [];
      setSchema(columns);
      setMappings(columns.map((col) => ({ source: col.Name, target: "" })));
    } catch (err: any) {
      console.error("Error fetching schema:", err);
      setError(err.message || "Failed to fetch schema.");
    }
  };

  // Save mappings
  const handleSave = async () => {
    try {
      const data: any[] = [];
      mappings.map((mapping: any) => {
        if (mapping?.target) {
          data.push({
            dbName: selectedDatabase,
            dbTable: selectedTable,
            dbColumn: mapping.target,
            standardColumn: mapping.source,
          });
        }
      });
      console.log("data saved:", data);
      const res = await mappingServiceInstance.createMappings(data);
      if (res.success) {
        message.success("Mappings saved successfully.");
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error("Error saving mappings.");
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    fetchDatabases();
  }, [selectedCatalog]);

  useEffect(() => {
    fetchTables();
  }, [selectedDatabase]);

  useEffect(() => {
    fetchSchema();
  }, [selectedTable]);

  const handleMappingChange = (index: number, value: string) => {
    const updatedMappings = [...mappings];
    updatedMappings[index].target = value;
    setMappings(updatedMappings);
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!newDatabaseName || !file) {
      message.error("Please provide both database name and file");
      return;
    }

    try {
      await schemaInstance.create(file, newDatabaseName);
      message.success("File uploaded successfully!");
      setIsModalVisible(false);
      setNewDatabaseName("");
      setFile(null);
    } catch (error) {
      message.error("Upload failed");
    }
  };

  return (
    <div className="mapping-container">
      <div className="mapping-header">
        <Title level={2} style={{ marginBottom: "20px" }}>
          Data Mapping
        </Title>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div className="selectors">
          <Select
            placeholder="Select Catalog"
            style={{ width: 200, marginRight: 10 }}
            onChange={(value) => setSelectedCatalog(value)}
          >
            {catalogs.map((catalog) => (
              <Select.Option key={catalog} value={catalog}>
                {catalog}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Database"
            style={{ width: 200, marginRight: 10 }}
            onChange={(value) => setSelectedDatabase(value)}
            disabled={!selectedCatalog}
          >
            {databases.map((db) => (
              <Select.Option key={db} value={db}>
                {db}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Table"
            style={{ width: 200, marginRight: 10 }}
            onChange={(value) => setSelectedTable(value)}
            disabled={!selectedDatabase}
          >
            {tables.map((table) => (
              <Select.Option key={table} value={table}>
                {table}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Schema Mapping"
            style={{ width: 200, marginRight: 10 }}
            onChange={(value) => setSelectDatabaseStograte(value)}
            disabled={!selectedTable}
          >
            {databaseStograte?.map((table) => (
              <Select.Option key={table} value={table}>
                {table}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Select Table Mapping"
            style={{ width: 200, marginRight: 10 }}
            onChange={(value) => setSelectTableMapping(value)}
            disabled={!selectedTable}
          >
            {tableStograte?.map((table) => (
              <Select.Option key={table} value={table}>
                {table}
              </Select.Option>
            ))}
          </Select>

          <Button type="primary" onClick={() => setIsModalVisible(true)}>
            Upload Sample
          </Button>
        </div>
      </div>

      <Modal
        title="Upload Schema Definition File"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleUpload}
        okText="Save"
      >
        <Input
          placeholder="Enter Database Name"
          value={newDatabaseName}
          onChange={(e) => setNewDatabaseName(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Upload
          beforeUpload={(file) => {
            setFile(file);
            return false; // prevent auto upload
          }}
          showUploadList={file ? [{ name: file.name }] : false}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
      </Modal>
      <Table
        dataSource={mappings}
        columns={[
          {
            title: "Schema Column",
            dataIndex: "source",
            key: "source",
          },
          {
            title: "Mapped Column",
            dataIndex: "target",
            key: "target",
            render: (text, _, index) => (
              <Input
                placeholder="Enter mapping"
                value={text}
                onChange={(e) => handleMappingChange(index, e.target.value)}
              />
            ),
          },
        ]}
        rowKey="source"
        pagination={false}
        style={{ marginTop: 20 }}
      />
      <Button
        type="primary"
        onClick={handleSave}
        style={{ marginTop: 20, display: "block" }}
      >
        Save Mappings
      </Button>
    </div>
  );
};

export default Mapping;
