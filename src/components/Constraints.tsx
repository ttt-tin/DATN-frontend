import React, { useState } from "react";
import { Button, Input, Space, message, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import constraintService from "../services/contraints.ts";

const { Title } = Typography;

const Constraints: React.FC = () => {
  const [inputs, setInputs] = useState<string[]>([""]); // Array to hold input values
  const [constraintTable, setConstraintTable] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Handler to add a new input line below a specific line
  const handleAddInputBelow = (index: number) => {
    const updatedInputs = [...inputs];
    updatedInputs.splice(index + 1, 0, ""); // Add a new empty input after the current index
    setInputs(updatedInputs);
  };

  // Handler to delete a specific input line
  const handleDeleteInput = (index: number) => {
    if (inputs.length === 1) {
      return; // Prevent deletion when there is only one input
    }
    const updatedInputs = inputs.filter((_, i) => i !== index); // Remove the input at the specified index
    setInputs(updatedInputs);
  };

  // Handler to update the value of a specific input
  const handleInputChange = (value: string, index: number) => {
    const updatedInputs = [...inputs];
    updatedInputs[index] = value;
    setInputs(updatedInputs);
  };

  const handleConstraintTable = (value: string) => {
    setConstraintTable(value);
  };

  // Handler to concatenate all inputs and call the API
  const handleSave = async () => {
    const concatenatedString = inputs.join("\n"); // Join all inputs with newline characters
    try {
      setLoading(true);
      const result = await constraintService.create(
        concatenatedString,
        constraintTable
      );
      console.log(result);
      setLoading(false);
      if (result.status === 200) {
        message.success("Data saved successfully.");
      } else {
        message.error("Error: " + result.data.message);
      }
    } catch (error) {
      message.error("Error saving data.");
      console.error(error);
    }
  };

  // Handler to add a new input at the bottom
  const handleAddInput = () => {
    setInputs([...inputs, ""]);
  };

  return (
    <div style={{ width: "100%" }}>
      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          width: "100%",
        }}
      >
        <h2>Constraint Configuration</h2>
        <Button type="primary" onClick={handleSave} loading={loading}>
          Save
        </Button>
      </Space>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
        <Input
          value={constraintTable}
          onChange={(e) => handleConstraintTable(e.target.value)}
          placeholder="Constraint tables"
          style={{ width: "100%" }}
        />
      </Space>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
        {inputs.map((input, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              width: "100%",
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value, index)}
              placeholder={`Constraint ${index + 1}`}
              style={{ flex: 1, width: "100%" }}
            />
            <MinusCircleOutlined
              onClick={() => handleDeleteInput(index)}
              style={{
                color: inputs.length === 1 ? "#d9d9d9" : "red",
                marginLeft: 8,
              }}
            />
          </div>
        ))}
      </Space>
      <Button
        type="dashed"
        onClick={handleAddInput}
        block
        icon={<PlusOutlined />}
      >
        Add Constraint
      </Button>
    </div>
  );
};

export default Constraints;
