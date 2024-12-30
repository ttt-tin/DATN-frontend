import axios from 'axios';

class MappingService {
  getTables() {
      throw new Error("Method not implemented.");
  }
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.API_URL}/mapping`;
  }

  async getStandardTables(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/standard?table=${table}`);
      return response.data;
    } catch (error) {
      console.error('Error while fetching standard tables:', error.message);
      throw error;
    }
  }

  async getCustomTables(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/custom?table=${table}`);
      return response.data;
    } catch (error) {
      console.error('Error while fetching custom tables:', error.message);
      throw error;
    }
  }

  async getStandardColumns(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/standard/columns?table=${table}`);
      return response.data;
    } catch (error) {
      console.error('Error while fetching standard columns:', error.message);
      throw error;
    }
  }

  async getCustomColumns(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/custom/columns?table=${table}`);
      return response.data;
    } catch (error) {
      console.error('Error while fetching custom columns:', error.message);
      throw error;
    }
  }

  async createMappings(payload: any): Promise<any> {
    try {
      
    } catch (error) {
      console.error('Error while creating mappings:', error.message);
      throw error
    }
  }
}

const mappingServiceInstance = new MappingService();
export default mappingServiceInstance;
