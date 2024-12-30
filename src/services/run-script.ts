import axios from 'axios';

class RunScript {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.API_URL}/python`;
  }

  async run(table: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}?table=${table}`);
      return response.data;
    } catch (error) {
      console.error('Error while run script:', error.message);
      throw error;
    }
  }
}

const runScriptInstance = new RunScript();
export default runScriptInstance;
