import axios from "axios";

class SchemaDefine {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.REACT_APP_API_URL}/columns`;
  }

  async gets(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}`);
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }

  async getsSchema(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/schemas`);
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }

  async getsTable(schemaName: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/columns/${schemaName}`);
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }

  async getsTableStructure(
    databaseName: string,
    tableName: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}?databaseName=${databaseName}&tableName=${tableName}`
      );
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }

  async create(file: File, databaseName: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${this.baseUrl}/upload?databaseName=${encodeURIComponent(
          databaseName
        )}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error while uploading file:", error.message);
      throw error;
    }
  }

  async createAthenaTablesFromSchema(schemaName: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/schemas/${schemaName}/create-athena`);
      return response.data;
    } catch (error: any) {
      console.error("Error creating Athena tables:", error.message);
      throw error;
    }
  }
}

const schemaInstance = new SchemaDefine();
export default schemaInstance;
