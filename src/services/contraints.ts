import axios from 'axios';

class ContraintsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.API_URL}/constraint`;
  }

  async create(constraintData: string, constraintTable: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/generate`, {
        tableName: constraintTable,
        constraintCondition: constraintData,
      });
      return response.data;
    } catch (error) {
      console.error('Error while creating constraint:', error.message);
      throw error;
    }
  }
}

const contraintsServiceInstance = new ContraintsService();
export default contraintsServiceInstance;
