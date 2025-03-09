import React, { useState, useEffect } from "react";
import { Tree, Spin, message, Table, Typography, Card } from "antd";
import type { DataNode } from "antd/es/tree";
import { DownOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;

interface SchemaField {
  name: string;
  type: string;
}

interface UnstructuredInfo {
  totalSize: string;
  fileCount: number;
  type: string;
  createDate: string;
  lastUpdated: string;
}

const Explorer: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<SchemaField[]>([]);
  const [unstructuredInfo, setUnstructuredInfo] =
    useState<UnstructuredInfo | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const structureRes = await axios.get(
          process.env.REACT_APP_API_URL + "/explorer/tables/hospital_data"
        );

        const unstructureRes = await axios.get(
          process.env.REACT_APP_API_URL + "/explorer/tables/metadata-db"
        );

        const structureTables = structureRes.data.map((table: string) => ({
          title: table,
          key: `structure-${table}`,
          isLeaf: true,
          database: "hospital_data",
        }));

        const unstructureTables = unstructureRes.data.map((table: string) => ({
          title: table,
          key: `unstructure-${table}`,
          isLeaf: true,
          database: "metadata-db",
        }));

        setTreeData([
          { title: "Structure", key: "structure", children: structureTables },
          {
            title: "Unstructure",
            key: "unstructure",
            children: unstructureTables,
          },
        ]);
      } catch (error) {
        message.error("Failed to fetch tables.");
        console.error("Error fetching tables:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  const onSelect = async (selectedKeys: React.Key[], info: any) => {
    if (info.node.isLeaf) {
      setSelectedTable(info.node.title);
      setSchemaLoading(true);
      setTableSchema([]);
      setUnstructuredInfo(null);

      try {
        const res = await axios.get(
          process.env.REACT_APP_API_URL +
            `/explorer/table-info/${info.node.database}/${info.node.title}`
        );

        if (info.node.database === "hospital_data") {
          setTableSchema(res.data);
        } else {
          setUnstructuredInfo(res.data);
        }
      } catch (error) {
        message.error("Failed to fetch data.");
        console.error("Error fetching data:", error);
      } finally {
        setSchemaLoading(false);
      }
    }
  };

  return (
    <div style={{ padding: "20px", width: "100%" }}>
           {" "}
      <Title level={2} style={{ marginBottom: "20px" }}>
        Data Explorer
      </Title>
           {" "}
      <div
        style={{
          display: "flex",

          flexDirection: "row",

          padding: "20px",

          borderRadius: "10px",

          boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",

          minHeight: "500px",

          width: "100%",
        }}
      >
                {/* Left Side - File Tree */}       {" "}
        <div
          style={{
            flex: 1,
            paddingRight: "20px",
            borderRight: "1px solid #ddd",
          }}
        >
                   {" "}
          {loading ? (
            <Spin size="large" style={{ display: "block", margin: "auto" }} />
          ) : (
            <Tree
              showIcon
              switcherIcon={<DownOutlined />}
              treeData={treeData}
              onSelect={onSelect}
              style={{
                background: "#fafafa",

                padding: "10px",

                borderRadius: "5px",

                height: "100%",

                overflow: "auto",
              }}
            />
          )}
                 {" "}
        </div>
                {/* Right Side - Schema or Unstructured Info Display */}       {" "}
        <div style={{ flex: 2, paddingLeft: "20px" }}>
                   {" "}
          {schemaLoading ? (
            <Spin size="large" style={{ display: "block", margin: "auto" }} />
          ) : selectedTable ? (
            <Card title={`Details for ${selectedTable}`} bordered>
                           {" "}
              {unstructuredInfo ? (
                <Table
                  dataSource={[
                    {
                      key: "Total Storage Size",
                      value: unstructuredInfo.totalSize,
                    },
                    { key: "File Count", value: unstructuredInfo.fileCount },
                    { key: "Type", value: unstructuredInfo.type },
                    {
                      key: "Last Updated Date",
                      value: unstructuredInfo.lastUpdated,
                    },
                    { key: "Region", value: unstructuredInfo.awsRegion },
                    { key: "URI", value: unstructuredInfo.folderUri },
                  ]}
                  columns={[
                    { title: "Property", dataIndex: "key", key: "key" },
                    { title: "Value", dataIndex: "value", key: "value" },
                  ]}
                  pagination={false}
                  showHeader={false}
                />
              ) : (
                <Table
                  dataSource={tableSchema.map((field) => ({
                    key: field.name,
                    name: field.name,
                    type: field.type,
                  }))}
                  columns={[
                    { title: "Field Name", dataIndex: "name", key: "name" },
                    { title: "Type", dataIndex: "type", key: "type" },
                  ]}
                  pagination={false}
                />
              )}
                         {" "}
            </Card>
          ) : (
            <p style={{ textAlign: "center", color: "#888", fontSize: "16px" }}>
                            Select a table to view its details            {" "}
            </p>
          )}
                 {" "}
        </div>
             {" "}
      </div>
         {" "}
    </div>
  );
};

export default Explorer;
