import React, { useEffect, useState } from "react";
import { Button, Select, Table, Spin, Collapse, Card, Typography, Layout } from "antd";
import { DatabaseOutlined, CodeOutlined, TableOutlined } from "@ant-design/icons";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-monokai";
import {
  AthenaClient,
  ListDatabasesCommand,
  ListDataCatalogsCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

const { Panel } = Collapse;
const { Title } = Typography;
const { Content } = Layout;

const QueryEditor: React.FC = () => {
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<string>("");
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [schema, setSchema] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Fetch databases for the selected catalog
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

  // Fetch tables for the selected database
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

  // Fetch schema for the selected table
  const fetchSchema = async () => {
    if (!selectedCatalog || !selectedDatabase || !selectedTable) return;
    try {
      const command = new GetTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
        TableName: selectedTable,
      });
      const response = await athenaClient.send(command);
      setSchema(response.TableMetadata?.Columns || []);
    } catch (err: any) {
      console.error("Error fetching schema:", err);
      setError(err.message || "Failed to fetch schema.");
    }
  };

  // Run query
  const runQuery = async () => {
    setLoading(true);
    setResults([]); // Clear previous results
    setError(""); // Clear previous error

    try {
      const startCommand = new StartQueryExecutionCommand({
        QueryString: query,
        QueryExecutionContext: {
          Catalog: selectedCatalog,
          Database: selectedDatabase,
        },
        ResultConfiguration: {
          OutputLocation: process.env.REACT_APP_S3_OUTPUT_BUCKET,
        },
      });
      const startResult = await athenaClient.send(startCommand);
      const queryExecutionId = startResult.QueryExecutionId;

      if (!queryExecutionId) throw new Error("Failed to start query.");

      // Poll for query status
      let status = "RUNNING";
      while (status === "RUNNING" || status === "QUEUED") {
        const executionResult = await athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
        );
        status = executionResult.QueryExecution?.Status?.State || "FAILED";

        if (status === "FAILED") throw new Error("Query execution failed.");
        if (status === "CANCELLED") throw new Error("Query was cancelled.");

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Fetch query results
      const resultsCommand = new GetQueryResultsCommand({
        QueryExecutionId: queryExecutionId,
      });
      const queryResults = await athenaClient.send(resultsCommand);

      const rows = queryResults.ResultSet?.Rows || [];
      const headers = rows[0]?.Data?.map((col) => col.VarCharValue) || [];
      const data = rows
        .slice(1)
        .map((row) =>
          Object.fromEntries(
            headers.map((header, i) => [
              header,
              row.Data?.[i]?.VarCharValue || null,
            ])
          )
        );

      setResults(data);
    } catch (err: any) {
      console.error("Error running query:", err);
      setError(err.message || "Query execution failed.");
    } finally {
      setLoading(false);
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

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ margin: 0 }}>
          <CodeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Athena Query Editor
        </Title>
      </div>
      
      <Content style={{ padding: '20px' }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Left Section: Database Selector and Schema */}
            <div style={{ width: '30%' }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <DatabaseOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                Database Section
              </Title>

              <div style={{ marginBottom: '20px' }}>
                <h4>Catalog</h4>
                <Select
                  placeholder="Select Catalog"
                  value={selectedCatalog}
                  onChange={setSelectedCatalog}
                  style={{ width: "100%", marginBottom: "16px" }}
                  options={catalogs.map((catalog) => ({
                    label: catalog,
                    value: catalog,
                  }))}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4>Database</h4>
                <Select
                  placeholder="Select Database"
                  value={selectedDatabase}
                  onChange={setSelectedDatabase}
                  style={{ width: "100%", marginBottom: "16px" }}
                  disabled={!selectedCatalog}
                  options={databases.map((db) => ({
                    label: db,
                    value: db,
                  }))}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4>Table</h4>
                <Select
                  placeholder="Select Table"
                  style={{ width: "100%", marginBottom: "16px" }}
                  disabled={!selectedDatabase}
                  onChange={setSelectedTable}
                  options={tables.map((table) => ({
                    label: table,
                    value: table,
                  }))}
                />
              </div>

              {selectedTable && schema.length > 0 && (
                <Collapse defaultActiveKey={[]} style={{ marginTop: "20px" }}>
                  <Panel header="Table Schema" key="1">
                    <Table
                      dataSource={schema}
                      columns={[
                        { title: "Attribute", dataIndex: "Name", key: "Name" },
                        { title: "Type", dataIndex: "Type", key: "Type" },
                      ]}
                      size="small"
                      pagination={false}
                      bordered
                      rowKey="Name"
                    />
                  </Panel>
                </Collapse>
              )}
            </div>

            {/* Right Section: Query Editor and Results */}
            <div style={{ width: '70%' }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <TableOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Query Editor
              </Title>
              
              <div style={{ marginBottom: '20px' }}>
                <AceEditor
                  mode="sql"
                  theme="monokai"
                  value={query}
                  onChange={setQuery}
                  name="query-editor"
                  width="100%"
                  height="300px"
                  style={{ borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                />
              </div>

              <Button
                type="primary"
                onClick={runQuery}
                loading={loading}
                style={{ marginBottom: '20px', width: '100%' }}
                disabled={!selectedDatabase || !query}
              >
                Run Query
              </Button>

              {error && (
                <div style={{ 
                  padding: '10px', 
                  background: '#fff2f0', 
                  border: '1px solid #ffccc7',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ color: '#ff4d4f', margin: 0 }}>{error}</p>
                </div>
              )}

              {loading && !error && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin size="large" />
                  <p style={{ marginTop: '10px' }}>Query is running, please wait...</p>
                </div>
              )}

              {results.length > 0 && (
                <div style={{ 
                  background: '#fff', 
                  padding: '16px', 
                  borderRadius: '4px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                }}>
                  <Table
                    dataSource={results}
                    columns={
                      results[0]
                        ? Object.keys(results[0]).map((key) => ({
                            title: key,
                            dataIndex: key,
                          }))
                        : []
                    }
                    scroll={{ x: 'max-content' }}
                    size="middle"
                    bordered
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default QueryEditor;
