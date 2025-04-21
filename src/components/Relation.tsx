// Relation.tsx
import React, { useState, useEffect } from "react";
import { Button, Form, Input, Space, Typography, message, Card } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import ReactFlow, {
  Controls,
  Background,
  Edge,
  Node,
  ReactFlowProvider,
} from "react-flow-renderer";
import dagre from "dagre";

const { Title } = Typography;

const nodeWidth = 180;
const nodeHeight = 60;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const Relation: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });

  useEffect(() => {
    fetchRelations();
  }, []);

  const fetchRelations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + "/relationships",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch relations");

      const data = await response.json();
      form.setFieldsValue({ relations: data });
      generateGraph(data);
    } catch (error) {
      message.error("Error fetching relations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + "/relationships",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values.relations),
        }
      );

      if (!response.ok) throw new Error("Failed to save relations");

      message.success("Relations saved successfully!");
      await fetchRelations();
    } catch (error) {
      message.error("Error saving relations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    name: number,
    remove: (index: number) => void
  ) => {
    setLoading(true);
    try {
      const relations = form.getFieldValue("relations");
      const relationToDelete = relations[name];

      if (relationToDelete?.id) {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/relationships/${relationToDelete.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to delete relation");

        message.success("Relation deleted successfully!");
      }

      remove(name);
      await fetchRelations();
    } catch (error) {
      message.error("Error deleting relation: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/relationships/auto-detect`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to auto-detect relationships");

      message.success("Auto-detected relationships successfully!");
      await fetchRelations();
    } catch (error) {
      message.error("Auto-detection failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateGraph = (relations: any[]) => {
    dagreGraph.setGraph({ rankdir: "LR" });

    const nodesMap = new Map<string, Node>();
    const edges: Edge[] = [];

    relations.forEach((rel) => {
      const sourceId = rel.tableReference;
      const targetId = rel.tableWasReference;

      if (!nodesMap.has(sourceId)) {
        nodesMap.set(sourceId, {
          id: sourceId,
          data: { label: sourceId },
          position: { x: 0, y: 0 },
          style: { padding: 10, background: "#f5f5f5", borderRadius: 6 },
        });
        dagreGraph.setNode(sourceId, { width: nodeWidth, height: nodeHeight });
      }

      if (!nodesMap.has(targetId)) {
        nodesMap.set(targetId, {
          id: targetId,
          data: { label: targetId },
          position: { x: 0, y: 0 },
          style: { padding: 10, background: "#f5f5f5", borderRadius: 6 },
        });
        dagreGraph.setNode(targetId, { width: nodeWidth, height: nodeHeight });
      }

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        label: `${rel.foKey} ➝ ${rel.priKey}`,
        animated: true,
        style: { stroke: "#1890ff" },
        labelBgStyle: { fill: "#fff", color: "#1890ff", fillOpacity: 0.8 },
      });

      dagreGraph.setEdge(sourceId, targetId);
    });

    dagre.layout(dagreGraph);

    nodesMap.forEach((node, nodeId) => {
      const { x, y } = dagreGraph.node(nodeId);
      node.position = { x, y };
    });

    setGraphData({ nodes: Array.from(nodesMap.values()), edges });
  };

  return (
    <ReactFlowProvider>
      <div>
        <Title level={2}>Table Relationships</Title>
        <div style={{ display: "flex", gap: "24px" }}>
          {/* Left: Relation Form (larger) */}
          <div style={{ flex: 0.8 }}>
            <Card
              title="Manage Relationships"
              bordered
              style={{ minHeight: "90vh" }}
            >
              <Form
                form={form}
                name="relations_form"
                onFinish={onFinish}
                autoComplete="off"
                layout="vertical"
              >
                <Form.List name="relations">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: 8,
                            background: "#fafafa",
                            padding: "12px",
                            borderRadius: "6px",
                            border: "1px solid #f0f0f0",
                          }}
                        >
                          <Form.Item
                            {...restField}
                            name={[name, "id"]}
                            style={{ display: "none" }}
                          >
                            <Input type="hidden" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "tableReference"]}
                            rules={[
                              { required: true, message: "Table is required" },
                            ]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <Input size="small" placeholder="Table" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "tableWasReference"]}
                            rules={[
                              {
                                required: true,
                                message: "Reference table is required",
                              },
                            ]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <Input size="small" placeholder="Reference Table" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "priKey"]}
                            rules={[
                              {
                                required: true,
                                message: "Primary key is required",
                              },
                            ]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <Input size="small" placeholder="Primary Key" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "foKey"]}
                            rules={[
                              {
                                required: true,
                                message: "Foreign key is required",
                              },
                            ]}
                            style={{ marginBottom: 0, flex: 1 }}
                          >
                            <Input size="small" placeholder="Foreign Key" />
                          </Form.Item>
                          <Button
                            danger
                            size="small"
                            icon={<MinusCircleOutlined />}
                            onClick={() => handleDelete(name, remove)}
                          />
                        </div>
                      ))}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          block
                          icon={<PlusOutlined />}
                        >
                          Add Relation
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Submit
                    </Button>
                    <Button onClick={fetchRelations} loading={loading}>
                      Refresh
                    </Button>
                    <Button
                      type="dashed"
                      onClick={handleAutoDetect}
                      loading={loading}
                    >
                      Auto Generate
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </div>

          {/* Right: Graph View (smaller) */}
          <div
            style={{
              flex: 0.8,
              height: "70vh",
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            <ReactFlow
              nodes={graphData.nodes}
              edges={graphData.edges}
              fitView
              nodesDraggable
              panOnScroll
              zoomOnScroll
              attributionPosition="bottom-left"
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default Relation;
