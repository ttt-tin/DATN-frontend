import axios from "axios";

class MappingService {
  getTables() {
    throw new Error("Method not implemented.");
  }
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.REACT_APP_API_URL}/mappings`;
  }

  async getStandardTables(table: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/standard?table=${table}`
      );
      return response.data;
    } catch (error) {
      console.error("Error while fetching standard tables:", error.message);
      throw error;
    }
  }

  async getMapping(
    dbName: string,
    tableName: string,
    standardTable: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/s${tableName}/dbName=${dbName}/standardTable=${standardTable}`
      );
      return response.data;
    } catch (error) {
      console.error("Error while fetching standard tables:", error.message);
      throw error;
    }
  }

  async getCustomTables(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/custom?table=${table}`);
      return response.data;
    } catch (error) {
      console.error("Error while fetching custom tables:", error.message);
      throw error;
    }
  }

  async getMappingData(databaseName: string, tableName: string, standardTable: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${databaseName}/${tableName}/${standardTable}`);
      return response.data;
    } catch (error) {
      console.error("Error while fetching custom tables:", error.message);
      throw error;
    }
  }


  async createMappings(payload: any[]): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error while creating mappings:", error.message);
      throw error;
    }
  }
}

const mappingServiceInstance = new MappingService();
export default mappingServiceInstance;
