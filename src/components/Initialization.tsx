import React, { useEffect, useState } from "react";
import { Button, message, Select, Spin } from "antd";
import axios from "axios";

const Initialization = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);

  const detectAndFetchSchemas = async () => {
    try {
      await axios.get(process.env.REACT_APP_API_URL + "/columns/detect", {
        params: {
          bucket: "bk-health-bucket-landing",
          prefix: "structure/",
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

  useEffect(() => {
    detectAndFetchSchemas();
  }, []);

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
        <>
          <p>Select a schema to initialize Athena tables:</p>
          <Select
            style={{ width: 300 }}
            placeholder="Select schema"
            onChange={(val) => setSelectedSchema(val)}
            value={selectedSchema}
            disabled={submitting}
          >
            {schemas.map((schema) => (
              <Select.Option key={schema} value={schema}>
                {schema}
              </Select.Option>
            ))}
          </Select>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spin size="small" /> : "Submit"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Initialization;
