import React, { useEffect, useState } from "react";
import { Button, message, Select, Spin, List, Card, Descriptions } from "antd";
import axios from "axios";

const Initialization = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const detectAndFetchSchemas = async () => {
    try {
      await axios.get(process.env.REACT_APP_API_URL + "/columns/detect", {
        params: {
          bucket: "bk-health-bucket-raw",
          sampleLines: 10,
        },
      });

      const response = await axios.get(
        process.env.REACT_APP_API_URL + "/columns/schemas"
      );
      setSchemas(response.data);
    } catch (error) {
      message.error("Failed to detect or fetch schemas.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (schema) => {
    setSchemaLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/columns/${schema}/tables`
      );
      setTables(response.data);
      setSelectedTable(null);
      setTableSchema(null);
    } catch (error) {
      message.error("Failed to fetch tables for the selected schema.");
    } finally {
      setSchemaLoading(false);
    }
  };

  const fetchTableSchema = async (schema, table) => {
    setSchemaLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/columns/${schema}/tables/${table}/schema`
      );
      setTableSchema(response.data);
    } catch (error) {
      message.error("Failed to fetch table schema.");
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    detectAndFetchSchemas();
  }, []);

  const handleSchemaChange = (schema) => {
    setSelectedSchema(schema);
    fetchTables(schema);
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    fetchTableSchema(selectedSchema, table);
  };

  const handleSubmit = async () => {
    if (!selectedSchema) return message.warning("Please select a schema.");

    setSubmitting(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/columns/schemas/${selectedSchema}/create-athena`
      );
      message.success("Tables created successfully in Athena.");
    } catch (error) {
      message.error("Failed to create tables in Athena.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Initialization</h2>
      {loading ? (
        <Spin size="large" />
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <p>Select a schema to initialize Athena tables:</p>
            <Select
              style={{ width: 300 }}
              placeholder="Select schema"
              onChange={handleSchemaChange}
              value={selectedSchema}
              disabled={submitting}
            >
              {schemas.map((schema) => (
                <Select.Option key={schema} value={schema}>
                  {schema}
                </Select.Option>
              ))}
            </Select>

            {selectedSchema && (
              <Card
                title="Tables"
                style={{ marginTop: 16 }}
                loading={schemaLoading}
              >
                <List
                  dataSource={tables}
                  renderItem={(table) => (
                    <List.Item
                      style={{
                        cursor: "pointer",
                        background:
                          selectedTable === table ? "#e6f7ff" : "transparent",
                      }}
                      onClick={() => handleTableClick(table)}
                    >
                      {table}
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={submitting || !selectedSchema}
              >
                {submitting ? <Spin size="small" /> : "Submit"}
              </Button>
            </div>
          </div>

          {selectedTable && tableSchema && (
            <Card title={`${selectedTable} Schema`} style={{ flex: 1 }}>
              <Descriptions bordered column={1}>
                {tableSchema.columns?.map((column) => (
                  <Descriptions.Item
                    key={column.name}
                    label={column.name}
                  >
                    {column.type}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Initialization;