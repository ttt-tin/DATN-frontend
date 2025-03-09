import React, { useState, useEffect } from "react";
import { Button, Form, Input, Space, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";

const Relation: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRelations();
  }, []);

  const fetchRelations = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.REACT_APP_API_URL + "/relationships", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch relations");

      const data = await response.json();
      form.setFieldsValue({
        relations: data
      });
    } catch (error) {
      message.error("Error fetching relations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.REACT_APP_API_URL + "/relationships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values.relations),
      });

      if (!response.ok) throw new Error("Failed to save relations");

      message.success("Relations saved successfully!");
      await fetchRelations();
    } catch (error) {
      message.error("Error saving relations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Modified delete handler to work with ID-based deletion
  const handleDelete = async (name: number, remove: (index: number) => void) => {
    setLoading(true);
    try {
      // Get the relation data to be deleted
      const relations = form.getFieldValue("relations");
      const relationToDelete = relations[name];

      // Check if the relation has an ID and make API call
      if (relationToDelete?.id) {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/relationships/${relationToDelete.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to delete relation");

        message.success("Relation deleted successfully!");
      }

      // Remove the field from the form
      remove(name);
    } catch (error) {
      message.error("Error deleting relation: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Define Relations</h2>
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
                <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                  {/* Hidden ID field */}
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
                    rules={[{ required: true, message: "Table name is required" }]}
                  >
                    <Input placeholder="Table" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "tableWasReference"]}
                    rules={[{ required: true, message: "Reference table is required" }]}
                  >
                    <Input placeholder="Reference To" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "priKey"]}
                    rules={[{ required: true, message: "Primary key is required" }]}
                  >
                    <Input placeholder="Primary Key" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "foKey"]}
                    rules={[{ required: true, message: "Foreign key is required" }]}
                  >
                    <Input placeholder="Foreign Key" />
                  </Form.Item>
                  <MinusCircleOutlined 
                    onClick={() => handleDelete(name, remove)}
                  />
                </Space>
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
            <Button
              onClick={fetchRelations}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Relation;