import React, { useEffect, useState } from "react";
import { Button, Select, Spin, Card, Space, message } from "antd";
import {
  AthenaClient,
  ListDatabasesCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
} from "@aws-sdk/client-athena";
import { DeleteOutlined } from "@ant-design/icons";

const { Option } = Select;

const UniversalKey = () => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<any[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [universalKeys, setUniversalKeys] = useState<{ fields: string[] }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [submitUniversalKeysLoading, seSubmitUniversalKeysLoading] = useState(false);

  const athenaClient = new AthenaClient({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
    },
  });

  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const command = new ListDatabasesCommand({
          CatalogName: "AwsDataCatalog",
        });
        const response = await athenaClient.send(command);
        setDatabases(response.DatabaseList?.map((db) => db.Name) || []);
      } catch (err) {
        console.error("Error fetching databases:", err);
      }
    };
    fetchDatabases();
  }, []);

  useEffect(() => {
    if (!selectedDatabase) return;
    const fetchTables = async () => {
      try {
        const command = new ListTableMetadataCommand({
          CatalogName: "AwsDataCatalog",
          DatabaseName: selectedDatabase,
        });
        const response = await athenaClient.send(command);
        setTables(response.TableMetadataList?.map((table) => table.Name) || []);
      } catch (err) {
        console.error("Error fetching tables:", err);
      }
    };
    fetchTables();
  }, [selectedDatabase]);

  useEffect(() => {
    if (!selectedTable || !selectedDatabase) return;
    const fetchSchemaAndUniversalKeys = async () => {
      setLoading(true);
      try {
        // Fetch table schema
        const command = new GetTableMetadataCommand({
          CatalogName: "AwsDataCatalog",
          DatabaseName: selectedDatabase,
          TableName: selectedTable,
        });
        const response = await athenaClient.send(command);
        const schemaData = response.TableMetadata?.Columns || [];
        setSchema(schemaData);

        // Fetch existing universal keys
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/athena/universal-keys?table_name=${selectedTable}&database=${selectedDatabase}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.universal_keys)) {
            setUniversalKeys(
              data.universal_keys.map((key) => ({ fields: key.split(",") })) // Split the comma-separated string into an array of fields
            );
          } else {
            setUniversalKeys([]); // If fetch fails, just empty
          }
        } else {
          setUniversalKeys([]); // If fetch fails, just empty
        }
      } catch (err) {
        console.error("Error fetching schema or universal keys:", err);
        message.error("Error loading table schema or universal keys");
      } finally {
        setLoading(false);
      }
    };
    fetchSchemaAndUniversalKeys();
  }, [selectedTable, selectedDatabase]);

  const handleAddUniversalKey = () => {
    setUniversalKeys((prev) => [...prev, { fields: [] }]);
  };

  const handleAddField = (index: number) => {
    setUniversalKeys((prev) =>
      prev.map((uk, idx) =>
        idx === index ? { ...uk, fields: [...uk.fields, ""] } : uk
      )
    );
  };

  const handleFieldChange = (
    uKeyIndex: number,
    fieldIndex: number,
    value: string
  ) => {
    setUniversalKeys((prev) =>
      prev.map((uk, idx) => {
        if (idx !== uKeyIndex) return uk;
        const newFields = [...uk.fields];
        newFields[fieldIndex] = value;
        return { ...uk, fields: newFields };
      })
    );
  };

  const handleRemoveField = (uKeyIndex: number, fieldIndex: number) => {
    setUniversalKeys((prev) =>
      prev.map((uk, idx) => {
        if (idx !== uKeyIndex) return uk;
        const newFields = uk.fields.filter((_, fIdx) => fIdx !== fieldIndex);
        return { ...uk, fields: newFields };
      })
    );
  };

  const handleRemoveUniversalKey = (index: number) => {
    setUniversalKeys((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (universalKeys.length === 0) {
      message.warning("Please add at least one Universal Key");
      return;
    }

    seSubmitUniversalKeysLoading(true);

    const requestData = {
      table_name: selectedTable,
      universal_keys: universalKeys.map((uk) => uk.fields),
      database: selectedDatabase,
    };

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/athena/universal-keys`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );
      const result = await response.json();

      setTimeout(() => {
        seSubmitUniversalKeysLoading(false);
      }, 2000);
      if (response.ok) {
        message.success(result.message || "Universal keys saved successfully!");
      } else {
        message.error(result.message || "Failed to save universal keys");
      }
    } catch (error) {
      console.error("Error submitting universal keys:", error);
      message.error("Error occurred while saving");
    }
  };

  return (
    <Card title="Universal Key Management">
      <Select
        placeholder="Select Database"
        style={{ width: "100%", marginBottom: 10 }}
        value={selectedDatabase || undefined}
        onChange={(value) => {
          setSelectedDatabase(value);
          setSelectedTable("");
          setSchema([]);
          setUniversalKeys([]);
        }}
      >
        {databases.map((db) => (
          <Option key={db} value={db}>
            {db}
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Select Table"
        style={{ width: "100%", marginBottom: 10 }}
        value={selectedTable || undefined}
        onChange={(value) => {
          setSelectedTable(value);
          setSchema([]);
          setUniversalKeys([]);
        }}
        disabled={!selectedDatabase}
      >
        {tables.map((table) => (
          <Option key={table} value={table}>
            {table}
          </Option>
        ))}
      </Select>

      {loading ? (
        <Spin />
      ) : (
        schema.length > 0 && (
          <>
            {universalKeys.map((uk, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e0e0e0",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>Universal Key {idx + 1}</strong>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveUniversalKey(idx)}
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  {uk.fields.map((field, fIdx) => (
                    <Space key={fIdx} style={{ marginBottom: 8 }}>
                      <Select
                        placeholder="Select field"
                        value={field}
                        style={{ width: 200 }}
                        onChange={(value) =>
                          handleFieldChange(idx, fIdx, value)
                        }
                      >
                        {(schema || []).map((col) => (
                          <Option key={col.Name} value={col.Name}>
                            {col.Name}
                          </Option>
                        ))}
                      </Select>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveField(idx, fIdx)}
                      />
                    </Space>
                  ))}
                </div>

                <Button
                  type="dashed"
                  size="small"
                  onClick={() => handleAddField(idx)}
                  style={{ marginTop: 10 }}
                >
                  + Add Field
                </Button>
              </div>
            ))}

            <Button
              type="dashed"
              onClick={handleAddUniversalKey}
              style={{ width: "100%", marginBottom: 10 }}
            >
              + Add Universal Key
            </Button>

            <Button
              type="primary"
              onClick={handleSubmit}
              style={{ width: "100%" }}
              disabled={universalKeys.length === 0}
              loading={submitUniversalKeysLoading}
            >
              Submit Universal Keys
            </Button>
          </>
        )
      )}
    </Card>
  );
};

export default UniversalKey;
