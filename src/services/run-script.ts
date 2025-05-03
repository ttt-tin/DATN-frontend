import axios from "axios";

class RunScript {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.REACT_APP_API_URL}/python`;
  }

  async run(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/run`);
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }

  async runCleaning(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/run/cleaning`);
      return response.data;
    } catch (error) {
      console.error("Error while run script:", error.message);
      throw error;
    }
  }
}

const runScriptInstance = new RunScript();
export default runScriptInstance;
