import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  Space,
  Typography,
  message,
  Card,
  Row,
  Col,
  Divider,
} from "antd";
import {
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
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
          {/* Left: Relation Form */}
          <div style={{ flex: 0.8 }}>
            <Card
              title="Manage Relationships"
              bordered
              style={{ minHeight: "90vh" }}
            >
              <Form
                layout="vertical"
                form={form}
                name="relations_form"
                onFinish={onFinish}
              >
                {/* Buttons Row */}
                <Row
                  justify="space-between"
                  align="middle"
                  style={{ marginBottom: 16 }}
                >
                  {/* Left side: Submit button */}
                  <Col>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Submit
                    </Button>
                  </Col>
                  {/* Right side: Other buttons */}
                  <Col>
                    <Space>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchRelations}
                        loading={loading}
                      />
                      <Button
                        type="dashed"
                        onClick={handleAutoDetect}
                        loading={loading}
                      >
                        Auto Generate
                      </Button>
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const values = form.getFieldValue("relations") || [];
                          form.setFieldsValue({ relations: [...values, {}] });
                        }}
                      >
                        Add Relation
                      </Button>
                    </Space>
                  </Col>
                </Row>

                {/* Form List */}
                <Form.List name="relations">
                  {(fields, { remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Card
                          key={key}
                          size="small"
                          style={{
                            marginBottom: 12,
                            border: "1px solid #d9d9d9",
                            borderRadius: 8,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }}
                          bodyStyle={{ padding: 12 }}
                        >
                          <Row gutter={12} align="middle">
                            <Form.Item
                              {...restField}
                              name={[name, "id"]}
                              style={{ display: "none" }}
                            >
                              <Input type="hidden" />
                            </Form.Item>
                            {[
                              { label: "Table", name: "tableReference" },
                              {
                                label: "Reference Table",
                                name: "tableWasReference",
                              },
                              { label: "Primary Key", name: "priKey" },
                              { label: "Foreign Key", name: "foKey" },
                            ].map(({ label, name: fieldName }, i) => (
                              <Col span={6} key={i}>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    marginBottom: 4,
                                  }}
                                >
                                  {label}
                                </div>
                                <Form.Item
                                  {...restField}
                                  name={[name, fieldName]}
                                  rules={[
                                    {
                                      required: true,
                                      message: `${label} is required`,
                                    },
                                  ]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input
                                    size="small"
                                    placeholder={label}
                                    style={{
                                      background: "#fafafa",
                                      borderColor: "#d9d9d9",
                                      borderRadius: 4,
                                      paddingLeft: 8,
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                            ))}
                            <Col span={1}>
                              <Button
                                danger
                                size="small"
                                icon={<MinusCircleOutlined />}
                                onClick={() => handleDelete(name, remove)}
                              />
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </>
                  )}
                </Form.List>
              </Form>
            </Card>
          </div>

          {/* Right: Graph View */}
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
