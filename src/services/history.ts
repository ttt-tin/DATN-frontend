import axios from 'axios';

class HistoryService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.REACT_APP_API_URL}/history`;
  }

  async get(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}`);
      return response.data;
    } catch (error) {
      console.error('Error:', error.message);
      throw error;
    }
  }
}

const historyServiceInstance = new HistoryService();
export default historyServiceInstance;
