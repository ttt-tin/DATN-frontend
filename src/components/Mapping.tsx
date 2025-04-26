import React, { useState, useEffect } from "react";
import {
  AthenaClient,
  ListTableMetadataCommand,
  GetTableMetadataCommand,
} from "@aws-sdk/client-athena";
import {
  Select,
  Button,
  Table,
  message,
  Typography,
  Collapse,
  Modal,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import mappingServiceInstance from "../services/mapping.ts";
import schemaInstance from "../services/schema-define.ts";
import stringSimilarity from "string-similarity";
import { v4 as uuidv4 } from "uuid";
import "./Mapping.css";
import axios from "axios";

const { Title } = Typography;
const { Panel } = Collapse;

const Mapping: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [databaseStorage, setDatabaseStorage] = useState<string[]>([]);
  const [tableStorage, setTableStorage] = useState<string[]>([]);
  const [mappingBlocks, setMappingBlocks] = useState<any[]>([]);
  const [isSchemaModalVisible, setIsSchemaModalVisible] = useState(false);
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>("");

  const selectedCatalog = "AwsDataCatalog";
  const selectedDatabase = "hospital_data";

  const athenaClient = new AthenaClient({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
    },
  });

  useEffect(() => {
    const fetchDatabaseStorage = async () => {
      try {
        const response = await schemaInstance.getsSchema();
        setDatabaseStorage(response);
      } catch (error) {
        console.error("Error fetching database storage:", error);
      }
    };
    fetchDatabaseStorage();
  }, []);

  // Fetch mappings from the backend
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const response =
          await axios.get(process.env.REACT_APP_API_URL + "/mappings/all");
        if (response.data.success) {
          setMappingBlocks(response.data.data); // Set the fetched data into state
        } else {
          message.error(response.data.message || "Failed to fetch mappings.");
        }
      } catch (error) {
        console.error("Error fetching mappings:", error);
        message.error("Error fetching mappings.");
      }
    };

    fetchMappings();
  }, []); // This effect runs once when the component mounts

  const handleSubmitAll = async () => {
    try {
      const allPayloads = mappingBlocks.flatMap((block) =>
        block.mappings
          .filter((m: any) => m.target)
          .map((m: any) => ({
            dbName: selectedDatabase,
            dbTable: block.selectedSourceTable,
            dbColumn: m.target,
            standardColumn: m.source,
          }))
      );

      if (allPayloads.length === 0) {
        return message.warning("No mappings to submit.");
      }

      const res = await mappingServiceInstance.createMappings(allPayloads);

      res.success
        ? message.success("All mappings submitted successfully!")
        : message.error(res.message);
    } catch (error) {
      console.error(error);
      message.error("Error submitting mappings.");
    }
  };

  const fetchTables = async () => {
    try {
      const command = new ListTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
      });
      const response = await athenaClient.send(command);
      const tableNames = response.TableMetadataList?.map((t) => t.Name!) || [];

      if (tableNames.length === 0) {
        handleInitializeSchema();
      } else {
        setTables(tableNames);
      }
    } catch (err: any) {
      console.error(err.message || "Failed to fetch tables.");
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleInitializeSchema = async () => {
    try {
      const response = await schemaInstance.getsSchema();
      setAvailableSchemas(response);
      setIsSchemaModalVisible(true);
    } catch (err) {
      message.error("Failed to fetch schema names.");
    }
  };

  const handleSchemaConfirm = async () => {
    if (!selectedSchemaName) {
      return message.warning("Please select a schema.");
    }
    try {
      await schemaInstance.createAthenaTablesFromSchema(selectedSchemaName);
      message.success("Tables created successfully in Athena.");
      setIsSchemaModalVisible(false);
      fetchTables();
    } catch (err) {
      message.error("Failed to create tables.");
    }
  };

  const addMappingBlock = () => {
    setMappingBlocks((prev) => [
      ...prev,
      {
        id: uuidv4(),
        selectedSourceTable: "",
        selectedDatabaseStorage: "",
        selectedTargetTable: "",
        sourceSchema: [],
        targetSchema: [],
        mappings: [],
      },
    ]);
  };

  const updateBlock = (id: string, updates: Partial<any>) => {
    setMappingBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  };

  const deleteBlock = (id: string) => {
    setMappingBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const fetchSourceSchema = async (blockId: string, tableName: string) => {
    try {
      const command = new GetTableMetadataCommand({
        CatalogName: selectedCatalog,
        DatabaseName: selectedDatabase,
        TableName: tableName,
      });
      const response = await athenaClient.send(command);
      const columns = response.TableMetadata?.Columns || [];
      updateBlock(blockId, {
        sourceSchema: columns,
        mappings: columns.map((col) => ({ source: col.Name, target: "" })),
      });
    } catch (error) {
      console.error("Error fetching source schema:", error);
    }
  };

  const fetchTargetTables = async (blockId: string, databaseName: string) => {
    try {
      const response = await schemaInstance.getsTable(databaseName);
      updateBlock(blockId, { targetSchema: [], selectedTargetTable: "" });
      setTableStorage(response);
    } catch (error) {
      console.error("Error fetching target tables:", error);
    }
  };

  const fetchTargetSchema = async (
    blockId: string,
    database: string,
    table: string
  ) => {
    try {
      const response = await schemaInstance.getsTableStructure(database, table);
      const block = mappingBlocks.find((b) => b.id === blockId);

      if (!block) return;

      const targetColumnNames = response.map((t: any) => t.column_name);

      const updatedMappings = block.sourceSchema.map((col: any) => {
        const match = stringSimilarity.findBestMatch(
          col.Name.toLowerCase(), // lower case source
          targetColumnNames.map((name: string) => name.toLowerCase()) // lower case targets
        );

        // Find the original target name (case-sensitive) matching the lowercase match
        const bestTargetOriginal = targetColumnNames.find(
          (name) => name.toLowerCase() === match.bestMatch.target
        );

        return {
          source: col.Name,
          target: match.bestMatch.rating >= 0.8 ? bestTargetOriginal || "" : "",
        };
      });

      updateBlock(blockId, {
        targetSchema: response,
        mappings: updatedMappings,
      });
    } catch (error) {
      console.error("Error fetching target schema:", error);
    }
  };

  const handleSaveBlock = async (blockId: string) => {
    const block = mappingBlocks.find((b) => b.id === blockId);
    if (!block) return;
    try {
      const payload = block.mappings
        .filter((m: any) => m.target)
        .map((m: any) => ({
          dbName: selectedDatabase,
          dbTable: block.selectedSourceTable,
          dbColumn: m.target,
          standardColumn: m.source,
        }));

      const res = await mappingServiceInstance.createMappings(payload);
      res.success
        ? message.success("Mappings saved successfully.")
        : message.error(res.message);
    } catch (error) {
      message.error("Error saving mappings.");
    }
  };

  const handleMappingChange = (
    blockId: string,
    index: number,
    value: string
  ) => {
    setMappingBlocks((prev) =>
      prev.map((block) => {
        if (block.id === blockId) {
          const updatedMappings = [...block.mappings];
          updatedMappings[index].target = value;
          return { ...block, mappings: updatedMappings };
        }
        return block;
      })
    );
  };

  const autoGenerateMappings = async () => {
    try {
      const generatedBlocks: any = [];

      for (const sourceTable of tables) {
        const sourceCommand = new GetTableMetadataCommand({
          CatalogName: selectedCatalog,
          DatabaseName: selectedDatabase,
          TableName: sourceTable,
        });
        const sourceResponse = await athenaClient.send(sourceCommand);
        const sourceColumns = sourceResponse.TableMetadata?.Columns || [];

        for (const db of databaseStorage) {
          const tablesInDb = await schemaInstance.getsTable(db);

          for (const targetTable of tablesInDb) {
            // Step 1: Compare table names
            const tableNameMatch = stringSimilarity.compareTwoStrings(
              sourceTable.toLowerCase(),
              targetTable.toLowerCase()
            );

            if (tableNameMatch >= 0.8) {
              // Step 2: Generate mapping
              const targetColumns = await schemaInstance.getsTableStructure(
                db,
                targetTable
              );

              const mappings = sourceColumns.map((sourceColumn) => {
                const bestMatch = stringSimilarity.findBestMatch(
                  sourceColumn.Name.toLowerCase(),
                  targetColumns.map((col: any) => col.column_name.toLowerCase())
                );

                return {
                  source: sourceColumn.Name,
                  target:
                    bestMatch.bestMatch.rating >= 0.8
                      ? targetColumns.find(
                          (col: any) =>
                            col.column_name.toLowerCase() ===
                            bestMatch.bestMatch.target
                        )?.column_name || ""
                      : "",
                };
              });

              generatedBlocks.push({
                id: uuidv4(),
                selectedSourceTable: sourceTable,
                selectedDatabaseStorage: db,
                selectedTargetTable: targetTable,
                sourceSchema: sourceColumns,
                targetSchema: targetColumns,
                mappings,
              });
            }
          }
        }
      }

      setMappingBlocks(generatedBlocks);
      message.success("Auto-generated mappings are ready.");
    } catch (error) {
      console.error("Error auto-generating mappings:", error);
      message.error("Failed to generate mappings.");
    }
  };

  return (
    <div className="mapping-container">
      <Title level={2}>Table Mappings</Title>
      <div className="actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addMappingBlock}
        >
          Add Mapping Block
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={autoGenerateMappings}
          style={{ marginLeft: 10 }}
        >
          Auto-Generate Mappings
        </Button>
        <Button
          type="primary"
          onClick={handleSubmitAll}
          style={{ marginLeft: 10 }}
        >
          Submit All Mappings
        </Button>
      </div>
      <div className="mapping-blocks">
        {mappingBlocks.map((block) => (
          <div key={block.id} className="mapping-block">
            <Collapse
              defaultActiveKey={["1"]}
              onChange={(key) => {
                // handle collapse change
              }}
            >
              <Panel header="Mapping Block" key="1">
                {/* Source Table Selection */}
                <div className="block-row">
                  <span className="block-label">Source Table</span>
                  <Select
                    style={{ width: 200 }}
                    onChange={(value) => {
                      updateBlock(block.id, { selectedSourceTable: value });
                      fetchSourceSchema(block.id, value);
                    }}
                    value={block.selectedSourceTable || undefined}
                  >
                    {tables.map((table) => (
                      <Select.Option key={table} value={table}>
                        {table}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* Target Table Selection */}
                <div className="block-row">
                  <span className="block-label">Target Table</span>
                  <Select
                    style={{ width: 200 }}
                    onChange={(value) => {
                      updateBlock(block.id, { selectedTargetTable: value });
                      fetchTargetSchema(
                        block.id,
                        block.selectedDatabaseStorage,
                        value
                      );
                    }}
                    value={block.selectedTargetTable || undefined}
                  >
                    {tableStorage.map((table) => (
                      <Select.Option key={table} value={table}>
                        {table}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* Mapping Schema */}
                <div className="mappings">
                  {block.mappings.map((m, idx) => (
                    <div key={idx} className="mapping-row">
                      <span className="mapping-source">{m.source}</span>
                      <Select
                        value={m.target}
                        onChange={(value) =>
                          handleMappingChange(block.id, idx, value)
                        }
                      >
                        {block.targetSchema.map((ts) => (
                          <Select.Option
                            key={ts.column_name}
                            value={ts.column_name}
                          >
                            {ts.column_name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="block-actions">
                  <Button
                    onClick={() => handleSaveBlock(block.id)}
                    style={{ marginRight: 10 }}
                  >
                    Save Mappings
                  </Button>
                  <Popconfirm
                    title="Are you sure to delete this block?"
                    onConfirm={() => deleteBlock(block.id)}
                  >
                    <Button type="danger" icon={<DeleteOutlined />}>
                      Delete Block
                    </Button>
                  </Popconfirm>
                </div>
              </Panel>
            </Collapse>
          </div>
        ))}
      </div>

      {/* Schema Modal */}
      <Modal
        title="Select Schema to Initialize"
        visible={isSchemaModalVisible}
        onCancel={() => setIsSchemaModalVisible(false)}
        onOk={handleSchemaConfirm}
      >
        <Select
          style={{ width: "100%" }}
          onChange={setSelectedSchemaName}
          value={selectedSchemaName || undefined}
        >
          {availableSchemas.map((schema) => (
            <Select.Option key={schema} value={schema}>
              {schema}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default Mapping;
