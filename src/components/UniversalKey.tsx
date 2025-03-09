import React, { useEffect, useState } from "react";
import { Button, Select, Table, Spin, Card, Checkbox, message } from "antd";
import {
  AthenaClient,
  ListDatabasesCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
} from "@aws-sdk/client-athena";

const UniversalKey = () => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<any[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [supportKeys, setSupportKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const universalKey = "resource_id";

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
    if (!selectedTable) return;

    const fetchSchemaAndData = async () => {
      setLoading(true);
      try {
        // Fetch table schema
        const schemaCommand = new GetTableMetadataCommand({
          CatalogName: "AwsDataCatalog",
          DatabaseName: selectedDatabase,
          TableName: selectedTable,
        });
        const schemaResponse = await athenaClient.send(schemaCommand);
        const schemaData = schemaResponse.TableMetadata?.Columns || [];
        setSchema(schemaData);

        // Fetch pre-selected data from the API
        const dataResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/athena/data?catalog=AwsDataCatalog&database=hospital_data&table=tables`
        );
        if (!dataResponse.ok) {
          throw new Error("Failed to fetch data");
        }
        const data = await dataResponse.json();

        // Find the entry matching the selected table and parse column_name
        const tableEntry = data.find(
          (item: any) => item.table_name === selectedTable
        );
        if (tableEntry && tableEntry.column_name) {
          const preSelectedColumns = tableEntry.column_name.split(",");
          setSupportKeys(preSelectedColumns);
        } else {
          setSupportKeys([]); // Reset if no matching table or no columns
        }
      } catch (err) {
        console.error("Error fetching schema or data:", err);
        message.error("Error loading table data");
      } finally {
        setLoading(false);
      }
    };
    fetchSchemaAndData();
  }, [selectedTable]);

  const handleSupportKeyChange = (key: string) => {
    setSupportKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    const requestData = {
      table_name: selectedTable,
      column_name: supportKeys,
    };

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/athena/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();
      if (response.ok) {
        message.success(result.message);
      } else {
        message.error("Failed to update data");
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      message.error("An error occurred");
    }
  };

  return (
    <Card title="Universal Key Selection">
      <Select
        placeholder="Select Database"
        style={{ width: "100%", marginBottom: 10 }}
        onChange={setSelectedDatabase}
      >
        {databases.map((db) => (
          <Select.Option key={db} value={db}>
            {db}
          </Select.Option>
        ))}
      </Select>

      <Select
        placeholder="Select Table"
        style={{ width: "100%", marginBottom: 10 }}
        onChange={setSelectedTable}
        disabled={!selectedDatabase}
      >
        {tables.map((table) => (
          <Select.Option key={table} value={table}>
            {table}
          </Select.Option>
        ))}
      </Select>

      {loading ? (
        <Spin />
      ) : (
        schema.length > 0 && (
          <>
            <Table
              dataSource={schema.map((col) => ({ key: col.Name, ...col }))}
              columns={[
                {
                  title: "Column Name",
                  dataIndex: "Name",
                },
                {
                  title: "Type",
                  dataIndex: "Type",
                },
                {
                  title: "Support Key",
                  dataIndex: "supportKey",
                  render: (_, record) => (
                    <Checkbox
                      checked={supportKeys.includes(record.Name)}
                      onChange={() => handleSupportKeyChange(record.Name)}
                      disabled={record.Name === universalKey}
                    />
                  ),
                },
              ]}
            />

            <Button
              type="primary"
              onClick={handleSubmit}
              style={{ marginTop: 10 }}
            >
              Submit
            </Button>
          </>
        )
      )}
    </Card>
  );
};

export default UniversalKey;
