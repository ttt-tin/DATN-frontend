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
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import mappingServiceInstance from "../services/mapping.ts";
import schemaInstance from "../services/schema-define.ts";
import stringSimilarity from "string-similarity";
import { v4 as uuidv4 } from "uuid";
import "./Mapping.css";
import axios from "axios";

const { Title } = Typography;
const { Panel } = Collapse;

const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[_\s-]/g, '') // Loại bỏ dấu gạch dưới, khoảng trắng và dấu gạch ngang
    .replace(/[^a-z0-9]/g, ''); // Chỉ giữ lại chữ cái và số
};

const removeCommonPrefixesAndSuffixes = (name: string): string[] => {
  const prefixes = ['ref_', 'reference_', 'fk_', 'foreign_key_', 'pk_', 'primary_key_'];
  const suffixes = ['_ref', '_reference', '_id', '_key', '_fk', '_pk'];
  
  let variations = [name];
  
  // Xử lý prefixes
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      variations.push(name.slice(prefix.length));
    }
  }
  
  // Xử lý suffixes
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      variations.push(name.slice(0, -suffix.length));
    }
  }

  // Thêm các biến thể đặc biệt
  const baseName = name.replace(/_?(?:id|reference|ref|key|fk|pk)$/i, '');
  if (baseName !== name) {
    variations.push(baseName);
    variations.push(baseName + 'id');
    variations.push(baseName + '_id');
    variations.push(baseName + 'reference');
    variations.push(baseName + '_reference');
  }
  
  return variations;
};

const getColumnSimilarity = (source: string, target: string): number => {
  const normalizedSource = normalizeColumnName(source);
  const normalizedTarget = normalizeColumnName(target);

  // Kiểm tra các trường hợp đặc biệt
  if (normalizedSource === normalizedTarget) return 1;
  
  // Xử lý các trường hợp phổ biến
  const specialCases = {
    'id': ['key_id', 'id', 'identifier', 'primary_key', 'reference', 'ref'],
    'name': ['fullname', 'full_name', 'username', 'user_name'],
    'date': ['created_date', 'updated_date', 'modified_date'],
    'time': ['created_time', 'updated_time', 'modified_time'],
    'type': ['category', 'classification', 'group'],
    'status': ['state', 'condition'],
    'description': ['desc', 'detail', 'info'],
    'code': ['reference', 'ref', 'identifier'],
    'amount': ['value', 'quantity', 'total'],
    'price': ['cost', 'fee', 'charge'],
  };

  // Kiểm tra các trường hợp đặc biệt
  for (const [key, variations] of Object.entries(specialCases)) {
    if (variations.includes(normalizedSource) && variations.includes(normalizedTarget)) {
      return 0.9;
    }
    if (normalizedSource === key && variations.includes(normalizedTarget)) {
      return 0.9;
    }
    if (normalizedTarget === key && variations.includes(normalizedSource)) {
      return 0.9;
    }
  }

  // Xử lý các biến thể của tên cột
  const sourceVariations = removeCommonPrefixesAndSuffixes(normalizedSource);
  const targetVariations = removeCommonPrefixesAndSuffixes(normalizedTarget);

  // Kiểm tra tất cả các biến thể
  for (const sourceVar of sourceVariations) {
    for (const targetVar of targetVariations) {
      // Kiểm tra trường hợp đặc biệt cho patient và encounter
      if ((sourceVar === 'patient' && targetVar === 'patient') ||
          (sourceVar === 'encounter' && targetVar === 'encounter')) {
        return 0.95;
      }

      if (sourceVar === targetVar) return 0.95;
      
      // Kiểm tra nếu một chuỗi chứa chuỗi kia
      if (sourceVar.includes(targetVar) || targetVar.includes(sourceVar)) {
        return 0.85;
      }
    }
  }

  // Kiểm tra các trường hợp đặc biệt cho patient và encounter
  const specialPatterns = [
    { pattern: /^(patient|encounter)(?:_(?:id|reference|ref))?$/i, weight: 0.95 },
    { pattern: /^(?:id|reference|ref)_(patient|encounter)$/i, weight: 0.95 }
  ];

  for (const { pattern, weight } of specialPatterns) {
    if (pattern.test(normalizedSource) && pattern.test(normalizedTarget)) {
      return weight;
    }
  }

  // Tính toán độ tương đồng cơ bản
  const basicSimilarity = stringSimilarity.compareTwoStrings(normalizedSource, normalizedTarget);

  // Nếu độ tương đồng cơ bản đã cao, trả về kết quả
  if (basicSimilarity >= 0.8) {
    return basicSimilarity;
  }

  // Kiểm tra các từ viết tắt phổ biến
  const abbreviations = {
    'id': 'identifier',
    'desc': 'description',
    'ref': 'reference',
    'amt': 'amount',
    'qty': 'quantity',
    'num': 'number',
    'dt': 'date',
    'tm': 'time',
    'nm': 'name',
    'cd': 'code',
    'fk': 'foreign_key',
    'pk': 'primary_key',
  };

  const expandedSource = abbreviations[normalizedSource] || normalizedSource;
  const expandedTarget = abbreviations[normalizedTarget] || normalizedTarget;

  if (expandedSource !== normalizedSource || expandedTarget !== normalizedTarget) {
    const expandedSimilarity = stringSimilarity.compareTwoStrings(expandedSource, expandedTarget);
    return Math.max(basicSimilarity, expandedSimilarity);
  }

  return basicSimilarity;
};

const Mapping: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [databaseStorage, setDatabaseStorage] = useState<string[]>([]);
  const [tableStorage, setTableStorage] = useState<string[]>([]);
  const [mappingBlocks, setMappingBlocks] = useState<any[]>([]);
  const [isSchemaModalVisible, setIsSchemaModalVisible] = useState(false);
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>("");
  const [mappingLoading, setMappingLoading] = useState(false);

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
        const response = await axios.get(
          process.env.REACT_APP_API_URL + "/mappings/all"
        );

        if (response.data.success) {
          const rawMappings = response.data.data;

          // Group mappings by a combination of standard_table and db_name
          const blocksBySourceTable = {};

          rawMappings.forEach((mapping) => {
            const key = `${mapping.standard_table}_${mapping.db_name}`; // Group by both standard_table and db_name

            if (!blocksBySourceTable[key]) {
              blocksBySourceTable[key] = {
                id: Date.now().toString() + Math.random(), // or use uuid
                selectedSourceTable: mapping.standard_table, // source = standard_table
                selectedTargetTable: mapping.db_table, // target = db_table
                selectedDatabaseStorage: mapping.db_name, // storage = db_name
                sourceSchema: [], // (optional) you might load it later
                targetSchema: [],
                mappings: [],
              };
            }

            blocksBySourceTable[key].mappings.push({
              source: mapping.standard_column, // source = standard_column
              target: mapping.db_column, // target = db_column
            });
          });

          console.log(blocksBySourceTable);

          const mappingBlocks = Object.values(blocksBySourceTable);

          setMappingBlocks(mappingBlocks);
        } else {
          message.error(response.data.message || "Failed to fetch mappings.");
        }
      } catch (error) {
        console.error("Error fetching mappings:", error.message);
        message.error("Error fetching mappings.");
      }
    };

    fetchMappings();
  }, []);

  const handleSubmitAll = async () => {
    try {
      const allPayloads = mappingBlocks.flatMap((block) =>
        block.mappings.map((m: any) => ({
          dbName: block.selectedDatabaseStorage,
          dbTable: block.selectedSourceTable,
          dbColumn: m.target,
          standardColumn: m.source,
          standardTable: block.selectedSourceTable,
          standardDb: "hospital_data",
        }))
      );

      console.log(allPayloads);

      if (allPayloads.length === 0) {
        return message.warning("No mappings to submit.");
      }

      setMappingLoading(true);

      const res = await mappingServiceInstance.createMappings(allPayloads);

      setTimeout(() => {
        setMappingLoading(false);
        res.success
          ? message.success("All mappings submitted successfully!")
          : message.error(res.message);
      }, 2000);
    } catch (error) {
      console.error(error);
      setMappingLoading(false);
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
        let sourceColumns = sourceResponse.TableMetadata?.Columns || [];

        // Exclude the 'key_id' field
        sourceColumns = sourceColumns.filter(
          (column) => column.Name?.toLowerCase() !== "key_id"
        );

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
                if (!sourceColumn.Name) return { source: '', target: '' };

                const bestMatch = targetColumns.reduce((best, targetCol) => {
                  const similarity = getColumnSimilarity(
                    sourceColumn.Name,
                    targetCol.column_name
                  );
                  return similarity > best.similarity
                    ? { column: targetCol.column_name, similarity }
                    : best;
                }, { column: '', similarity: 0 });

                return {
                  source: sourceColumn.Name,
                  target: bestMatch.similarity >= 0.7 ? bestMatch.column : "",
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

  const isMappingComplete = (block: any) => {
    return (
      block.selectedSourceTable &&
      block.selectedDatabaseStorage &&
      block.selectedTargetTable &&
      block.mappings.every((m: any) => m.target !== "")
    );
  };

  const isMappingIncomplete = (block: any) => {
    return (
      block.selectedSourceTable ||
      block.selectedDatabaseStorage ||
      block.selectedTargetTable ||
      block.mappings.some((m: any) => m.target !== "")
    );
  };

  return (
    <div className="mapping-container">
      <div className="mapping-header">
        <Title level={2}>Data Mapping</Title>

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addMappingBlock}
          >
            Add Mapping
          </Button>

          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={autoGenerateMappings}
          >
            Auto Generate
          </Button>
          <Button
            type="primary"
            onClick={handleSubmitAll}
            loading={mappingLoading}
            style={{ marginLeft: 10 }}
          >
            Submit All Mappings
          </Button>
        </div>

        {/* Schema Init Modal */}
        <Modal
          title="No Tables Found. Choose a table to initialize schema"
          open={isSchemaModalVisible}
          onCancel={() => setIsSchemaModalVisible(false)}
          onOk={handleSchemaConfirm}
          okText="Initialize"
        >
          <p>Select a schema to create tables in Athena:</p>
          <Select
            style={{ width: "100%" }}
            placeholder="Select schema"
            onChange={(val) => setSelectedSchemaName(val)}
          >
            {availableSchemas.map((schema) => (
              <Select.Option key={schema} value={schema}>
                {schema}
              </Select.Option>
            ))}
          </Select>
        </Modal>

        {/* Mapping Blocks */}
        <Collapse accordion style={{ marginTop: 20 }}>
          {mappingBlocks.map((block) => (
            <Panel
              header={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isMappingComplete(block) ? (
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  ) : isMappingIncomplete(block) ? (
                    <WarningOutlined style={{ color: "#faad14" }} />
                  ) : null}
                  {`Mapping ${block.selectedSourceTable || "Source"} ➔ ${
                    block.selectedTargetTable || "Target"
                  } (${block.selectedDatabaseStorage || "No DB"})`}
                </div>
              }
              key={block.id}
              extra={
                <Popconfirm
                  title="Are you sure to delete this mapping block?"
                  onConfirm={() => deleteBlock(block.id)}
                >
                  <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              }
            >
              <div style={{ marginBottom: 15, display: "flex", gap: 10 }}>
                <Select
                  placeholder="Select Source Table"
                  style={{ width: 200 }}
                  value={block.selectedSourceTable}
                  onChange={(val) => {
                    updateBlock(block.id, { selectedSourceTable: val });
                    fetchSourceSchema(block.id, val);
                  }}
                  options={tables.map((table) => ({
                    label: table,
                    value: table,
                  }))}
                  allowClear
                />

                <Select
                  placeholder="Select Database Storage"
                  style={{ width: 200 }}
                  value={block.selectedDatabaseStorage}
                  onChange={(val) => {
                    updateBlock(block.id, { selectedDatabaseStorage: val });
                    fetchTargetTables(block.id, val);
                  }}
                  options={databaseStorage.map((db) => ({
                    label: db,
                    value: db,
                  }))}
                  allowClear
                />

                <Select
                  placeholder="Select Target Table"
                  style={{ width: 200 }}
                  value={block.selectedTargetTable}
                  onChange={(val) => {
                    updateBlock(block.id, { selectedTargetTable: val });
                    fetchTargetSchema(
                      block.id,
                      block.selectedDatabaseStorage,
                      val
                    );
                  }}
                  options={tableStorage.map((table) => ({
                    label: table,
                    value: table,
                  }))}
                  allowClear
                />
              </div>

              <Table
                dataSource={block.mappings}
                columns={[
                  {
                    title: "Source Column",
                    dataIndex: "source",
                    key: "source",
                  },
                  {
                    title: "Target Column",
                    dataIndex: "target",
                    key: "target",
                    render: (text, record, index) => {
                      const standardColumns = block.targetSchema
                        .map((item: any) => item.column_name)
                        .filter((col: any) => typeof col === "string");

                      return (
                        <Select
                          style={{ width: "100%" }}
                          showSearch
                          placeholder="Select or type mapping"
                          value={text || undefined}
                          onChange={(val) =>
                            handleMappingChange(block.id, index, val)
                          }
                          options={standardColumns.map((col: string) => ({
                            label: col,
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
              />

              <Button
                type="primary"
                style={{ marginTop: 10 }}
                onClick={() => handleSaveBlock(block.id)}
              >
                Save This Mapping
              </Button>
            </Panel>
          ))}
        </Collapse>
      </div>
    </div>
  );
};

export default Mapping;
