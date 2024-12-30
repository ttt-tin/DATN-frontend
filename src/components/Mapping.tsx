import React, { useEffect, useState } from "react";
import { Button, Select, Table, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import "./Mapping.css";
import mappingService from "../services/mapping.ts";

const Mapping: React.FC = () => {
  const [customTables, setCustomTables] = useState<string[]>([]);
  const [standardTables, setStandardTables] = useState<string[]>([]);
  const [selectedCustomTable, setSelectedCustomTable] = useState<string>("");
  const [selectedStandardTable, setSelectedStandardTable] = useState<string>("");
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [standardColumns, setStandardColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{ source: string; target: string }[]>([
    { source: "", target: "" },
  ]);

  // Fetch custom and standard tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const [custom, standard] = await Promise.all([
          mappingService.getCustomTables(""),
          mappingService.getStandardTables(""),
        ]);
        setCustomTables(custom || []);
        setStandardTables(standard || []);
      } catch (error) {
        message.error("Error fetching table options.");
        console.error(error);
      }
    };
    fetchTables();
  }, []);

  // Fetch columns based on selected custom table
  useEffect(() => {
    const fetchCustomColumns = async () => {
      if (!selectedCustomTable) return;
      try {
        const columns = await mappingService.getCustomColumns(selectedCustomTable);
        setCustomColumns(columns || []);
      } catch (error) {
        message.error("Error fetching custom table columns.");
        console.error(error);
      }
    };
    fetchCustomColumns();
  }, [selectedCustomTable]);

  // Fetch columns based on selected standard table
  useEffect(() => {
    const fetchStandardColumns = async () => {
      if (!selectedStandardTable) return;
      try {
        const columns = await mappingService.getStandardColumns(selectedStandardTable);
        setStandardColumns(columns || []);
      } catch (error) {
        message.error("Error fetching standard table columns.");
        console.error(error);
      }
    };
    fetchStandardColumns();
  }, [selectedStandardTable]);

  // Handle table selection
  const handleCustomTableChange = (value: string) => setSelectedCustomTable(value);
  const handleStandardTableChange = (value: string) => setSelectedStandardTable(value);

  // Handle mapping change
  const handleMappingChange = (
    value: string,
    index: number,
    column: "source" | "target"
  ) => {
    const updatedMappings = [...mappings];
    updatedMappings[index][column] = value;
    setMappings(updatedMappings);
  };

  // Add a new mapping row
  const handleAddMapping = () => setMappings([...mappings, { source: "", target: "" }]);

  // Delete a mapping row
  const handleDeleteMapping = (index: number) => {
    if (mappings.length === 1) return;
    setMappings(mappings.filter((_, i) => i !== index));
  };

  // Save mappings
  const handleSave = async () => {
    try {
      const payload = {
        customTable: selectedCustomTable,
        standardTable: selectedStandardTable,
        mappings,
      };
      const result = await mappingService.createMappings(payload);
      message.success("Mappings saved successfully.");
      console.log(result);
    } catch (error) {
      message.error("Error saving mappings.");
      console.error(error);
    }
  };

  return (
    <div className="constraints-container">
      <div className="constraints-header">
        <h2 className="constraints-title">Mapping</h2>
        <Button
          type="primary"
          onClick={handleSave}
          className="constraints-save-button"
        >
          Save
        </Button>
      </div>
      <div className="constraints-select-container">
        <Select
          value={selectedCustomTable}
          onChange={handleCustomTableChange}
          placeholder="Select Custom Table"
          style={{ width: 300, marginRight: 20 }}
        >
          {customTables.map((table) => (
            <Select.Option key={table} value={table}>
              {table}
            </Select.Option>
          ))}
        </Select>
        <Select
          value={selectedStandardTable}
          onChange={handleStandardTableChange}
          placeholder="Select Standard Table"
          style={{ width: 300 }}
        >
          {standardTables.map((table) => (
            <Select.Option key={table} value={table}>
              {table}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Table
        dataSource={mappings}
        columns={[
          {
            title: "Source Column",
            dataIndex: "source",
            key: "source",
            render: (text, _, index) => (
              <Select
                value={text}
                onChange={(value) => handleMappingChange(value, index, "source")}
                placeholder="Select source column"
                style={{ width: "100%" }}
              >
                {customColumns.map((col) => (
                  <Select.Option key={col} value={col}>
                    {col}
                  </Select.Option>
                ))}
              </Select>
            ),
          },
          {
            title: "Target Column",
            dataIndex: "target",
            key: "target",
            render: (text, _, index) => (
              <Select
                value={text}
                onChange={(value) => handleMappingChange(value, index, "target")}
                placeholder="Select target column"
                style={{ width: "100%" }}
              >
                {standardColumns.map((col) => (
                  <Select.Option key={col} value={col}>
                    {col}
                  </Select.Option>
                ))}
              </Select>
            ),
          },
          {
            title: "Actions",
            key: "actions",
            render: (_, __, index) => (
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteMapping(index)}
                danger
                disabled={mappings.length === 1}
              />
            ),
          },
        ]}
        rowKey={(record, index) => index.toString()}
        pagination={false}
        footer={() => (
          <Button type="link" icon={<PlusOutlined />} onClick={handleAddMapping}>
            Add Mapping
          </Button>
        )}
      />
    </div>
  );
};

export default Mapping;
