import axios from 'axios';

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.REACT_APP_API_URL}/notification`;
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

const notificationServiceInstance = new NotificationService();
export default notificationServiceInstance;
