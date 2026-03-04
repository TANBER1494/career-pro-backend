const axios = require('axios');
const AppError = require('./AppError');

class AiService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000',
      timeout: 10000, // Wait for 10 seconds max
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generic method to send requests to AI Service
   * @param {string} method - 'POST', 'GET'
   * @param {string} endpoint - e.g., '/analyze-cv'
   * @param {object} data - The payload
   */
  async _request(method, endpoint, data = {}) {
    try {
      const response = await this.client({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error) {
      // Log error for debugging
      console.error(`AI Service Error [${endpoint}]:`, error.message);

      // If AI server is down
      if (error.code === 'ECONNREFUSED') {
        throw new AppError(
          'AI Service is currently unavailable. Please try again later.',
          503
        );
      }

      // If AI returned an error response (e.g., 400, 500)
      if (error.response) {
        throw new AppError(
          error.response.data.message || 'Error processing request by AI.',
          error.response.status
        );
      }

      throw new AppError('Internal Server Error during AI communication.', 500);
    }
  }

  // --- Public Methods for Controllers ---

  async analyzeCV(filePath) {
    // Send file path to AI to read and analyze
    return await this._request('POST', '/analyze-cv', { filePath });
  }

  async matchJobs(seekerProfile, jobList) {
    return await this._request('POST', '/match-jobs', {
      seekerProfile,
      jobList,
    });
  }

  // ============================================================
  // 🚀 Personality Test AI Integration (REAL AZURE MODE)
  // ============================================================
  async analyzePersonality(answers) {
    try {
      const mappedAnswers = answers.map(val => val - 4);
      
      console.log("🚀 [REAL MODE] Sending to Azure:", { answers: mappedAnswers });

      const response = await axios.post(
        "https://careerpro-api-accub9c9gncuewd7.swedencentral-01.azurewebsites.net/predict",
        {
          answers: mappedAnswers 
        }
      );

      console.log("✅ [AZURE RESPONSE]:", response.data);

      // 💡 التعديل هنا: نستخرج كود الشخصية فقط (ENTJ مثلاً) من الأوبجكت
      const mbtiCode = response.data.personality; 

      // إرجاع الكود للكنترولر عشان يكمل شغله الطبيعي
      return { prediction: mbtiCode };
      
    } catch (error) {
      let errorMessage = "Failed to get prediction from AI model.";
      if (error.response) {
        console.error("❌ Azure Rejected the Request:", error.response.data);
        errorMessage = `AI Model Error: ${JSON.stringify(error.response.data)}`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "AI Model took too long to respond (Timeout).";
      }
      throw new AppError(errorMessage, 500); 
    }
  }
}

// Export a single instance (Singleton)
module.exports = new AiService();
