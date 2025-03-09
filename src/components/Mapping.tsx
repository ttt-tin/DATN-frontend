import React, { useState, useEffect } from "react";
import {
  AthenaClient,
  ListDataCatalogsCommand,
  ListDatabasesCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
} from "@aws-sdk/client-athena";
import { Select, Button, Input, Table, message } from "antd";
import "./Mapping.css";
import mappingServiceInstance from "../services/mapping.ts";

const Mapping: React.FC = () => {
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<{ Name: string; Type: string }[]>([]);
  const [mappings, setMappings] = useState<{ source: string; target: string }[]>(
    []
  );

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
        response.DataCatalogsSummary?.map((catalog) => catalog.CatalogName!) || []
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
          })
        }
      })
      console.log("data saved:", data);
      const res = await mappingServiceInstance.createMappings(data);
      if (res.success) {
        message.success("Mappings saved successfully.");
      }
      else {
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

  return (
    <div className="mapping-container">
      <div className="mapping-header">
        <h2>Schema Mapping</h2>
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
            style={{ width: 200 }}
            onChange={(value) => setSelectedTable(value)}
            disabled={!selectedDatabase}
          >
            {tables.map((table) => (
              <Select.Option key={table} value={table}>
                {table}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
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
