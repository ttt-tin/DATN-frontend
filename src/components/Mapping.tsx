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
import "./Mapping.css";
import mappingServiceInstance from "../services/mapping.ts";
import { UploadOutlined } from "@ant-design/icons";
import schemaInstance from "../services/schema-define.ts";
import stringSimilarity from "string-similarity";

const { Title } = Typography;

const Mapping: React.FC = () => {
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<{ Name: string; Type: string }[]>([]);
  const [mappings, setMappings] = useState<{ source: string; target: string }[]>([]);
  const [databaseStograte, setDatabaseStograte] = useState<string[]>([]);
  const [tableStograte, setTableStograte] = useState<string[]>([]);
  const [selectDatabaseStograte, setSelectDatabaseStograte] = useState<string>();
  const [selectTableMapping, setSelectTableMapping] = useState<string>();
  const [tableStructure, setTableStructure] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchDatabaseStograte = async () => {
      try {
        const response = await schemaInstance.getsSchema();
        setDatabaseStograte(response);
      } catch (error) {
        console.error("Error fetching database stograte:", error);
      }
    };
    fetchDatabaseStograte();
  }, []);

  useEffect(() => {
    const fetchColumnStograte = async () => {
      if (!selectDatabaseStograte) return;
      try {
        const response = await schemaInstance.getsTable(selectDatabaseStograte);
        setTableStograte(response);
      } catch (error) {
        console.error("Error fetching Column stograte:", error);
      }
    };
    fetchColumnStograte();
  }, [selectDatabaseStograte]);

  useEffect(() => {
    const fetchColumnMapping = async () => {
      if (!selectDatabaseStograte || !selectTableMapping || !selectedTable) return;
      try {
        const response = await mappingServiceInstance.getMappingData(
          selectDatabaseStograte,
          selectTableMapping,
          selectedTable
        );
        const updatedMappings = schema.map((col) => {
          const matched = response.find(
            (item: any) => item.standardColumn === col.Name
          );
          return {
            source: col.Name,
            target: matched ? matched.dbColumn : "",
          };
        });
        setMappings(updatedMappings);
      } catch (error) {
        console.error("Error fetching Column mapping:", error);
      }
    };

    const fetchTableStructure = async () => {
      if (!selectDatabaseStograte || !selectTableMapping) return;
      try {
        const response = await schemaInstance.getsTableStructure(
          selectDatabaseStograte,
          selectTableMapping
        );
        setTableStructure(response);
      } catch (error) {
        console.error("Error fetching table structure:", error);
      }
    };

    fetchColumnMapping();
    fetchTableStructure();
  }, [selectTableMapping, schema]);

  const fetchCatalogs = async () => {
    try {
      const command = new ListDataCatalogsCommand({});
      const response = await athenaClient.send(command);
      setCatalogs(response.DataCatalogsSummary?.map((c) => c.CatalogName!) || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch catalogs.");
    }
  };

  const fetchDatabases = async () => {
    if (!selectedCatalog) return;
    try {
      const command = new ListDatabasesCommand({ CatalogName: selectedCatalog });
      const response = await athenaClient.send(command);
      setDatabases(response.DatabaseList?.map((db) => db.Name!) || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch databases.");
    }
  };

  const fetchTables = async () => {
    if (!selectedCatalog || !selectedDatabase) return;
    try {
      const command = new ListTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
      });
      const response = await athenaClient.send(command);
      setTables(response.TableMetadataList?.map((t) => t.Name!) || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tables.");
    }
  };

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
      setError(err.message || "Failed to fetch schema.");
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
    const updated = [...mappings];
    updated[index].target = value;
    setMappings(updated);
  };

  const handleSave = async () => {
    try {
      const payload = mappings
        .filter((m) => m.target)
        .map((m) => ({
          dbName: selectedDatabase,
          dbTable: selectedTable,
          dbColumn: m.target,
          standardColumn: m.source,
        }));

      const res = await mappingServiceInstance.createMappings(payload);
      res.success
        ? message.success("Mappings saved successfully.")
        : message.error(res.message);
    } catch {
      message.error("Error saving mappings.");
    }
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!newDatabaseName || !file) {
      return message.error("Please provide both database name and file");
    }
    try {
      await schemaInstance.create(file, newDatabaseName);
      message.success("File uploaded successfully!");
      setIsModalVisible(false);
      setNewDatabaseName("");
      setFile(null);
    } catch {
      message.error("Upload failed");
    }
  };

  return (
    <div className="mapping-container">
      <div className="mapping-header">
        <Title level={2}>Data Mapping</Title>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div className="selectors">
          <Select
            placeholder="Select Catalog"
            style={{ width: 200, marginRight: 10 }}
            onChange={setSelectedCatalog}
          >
            {catalogs.map((c) => (
              <Select.Option key={c} value={c}>
                {c}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Database"
            style={{ width: 200, marginRight: 10 }}
            onChange={setSelectedDatabase}
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
            onChange={setSelectedTable}
            disabled={!selectedDatabase}
          >
            {tables.map((t) => (
              <Select.Option key={t} value={t}>
                {t}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Schema Mapping"
            style={{ width: 200, marginRight: 10 }}
            onChange={setSelectDatabaseStograte}
            disabled={!selectedTable}
          >
            {databaseStograte.map((d) => (
              <Select.Option key={d} value={d}>
                {d}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Select Table Mapping"
            style={{ width: 200, marginRight: 10 }}
            onChange={setSelectTableMapping}
            disabled={!selectDatabaseStograte}
          >
            {tableStograte.map((t) => (
              <Select.Option key={t} value={t}>
                {t}
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
          beforeUpload={(f) => {
            setFile(f);
            return false;
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
            render: (text, record, index) => {
              const standardColumns = tableStructure
                .map((item) => item.column_name)
                .filter((col): col is string => typeof col === "string");

              const bestMatch =
                record.source && standardColumns.length
                  ? stringSimilarity.findBestMatch(record.source, standardColumns)
                  : null;

              const autoSuggest =
                bestMatch && bestMatch.bestMatch.rating >= 0.8
                  ? bestMatch.bestMatch.target
                  : undefined;

              return (
                <Select
                  style={{ width: "100%" }}
                  showSearch
                  placeholder="Select or type mapping"
                  value={text || autoSuggest || undefined}
                  onChange={(val) => handleMappingChange(index, val)}
                  options={standardColumns.map((col) => ({
                    label: col === autoSuggest ? `${col} (Suggested)` : col,
                    value: col,
                  }))}
                  allowClear
                />
              );
            },
          },
        ]}
        rowKey="source"
        pagination={false}
        style={{ marginTop: 20 }}
      />

      <Button type="primary" onClick={handleSave} style={{ marginTop: 20 }}>
        Save Mappings
      </Button>
    </div>
  );
};

export default Mapping;
