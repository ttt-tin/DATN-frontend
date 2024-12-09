import React, { useState } from "react";
import { Button, Input, Space, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import "./Constraints.css"; // Add a corresponding CSS file

const Constraints: React.FC = () => {
  const [inputs, setInputs] = useState<string[]>([""]); // Array to hold input values

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

  // Handler to concatenate all inputs and call the API
  const handleSave = async () => {
    const concatenatedString = inputs.join("\n"); // Join all inputs with newline characters
    try {
      const response = await axios.post("/api/constraints", { data: concatenatedString });
      message.success("Data saved successfully!");
    } catch (error) {
      message.error("Error saving data.");
      console.error(error);
    }
  };

  return (
    <div className="constraints-container">
      <div className="constraints-header">
        <h2 className="constraints-title">Constraints</h2>
        <Button
          type="primary"
          onClick={handleSave}
          className="constraints-save-button"
        >
          Save
        </Button>
      </div>
      <Space direction="vertical" className="constraints-space">
        {inputs.map((input, index) => (
          <div key={index} className="constraints-input-row">
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value, index)}
              placeholder={`Constraint ${index + 1}`}
              className="constraints-input"
            />
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => handleAddInputBelow(index)}
              className="constraints-add-button"
            />
            <Button
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteInput(index)}
              className="constraints-delete-button"
              danger
              disabled={inputs.length === 1} // Disable the delete button if there is only one input
            />
          </div>
        ))}
      </Space>
    </div>
  );
};

export default Constraints;
