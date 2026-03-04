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
  // 💡 Personality Test AI Integration (With Mock Mode)
  // ============================================================
// ============================================================
  // 🚀 Personality Test AI Integration (REAL AZURE MODE)
  // ============================================================
  async analyzePersonality(answers) {
    try {
      console.log("🚀 [REAL MODE] Sending Vector to Azure AI...");
      console.log("Vector Data:", answers);

      // 1. إرسال الريكويست الفعلي لموديل الـ AI (بدون Reshape)
      // نرسل الـ answers مباشرة في مفتاح features (أو حسب ما تيم AI برمج الـ Flask)
      const response = await axios.post(
        "https://careerpro-api-accub9c9gncuewd7.swedencentral-01.azurewebsites.net/predict",
        {
          features: answers 
        }
      );

      console.log("✅ [AZURE RESPONSE]:", response.data);

      // 2. استخراج الرقم المتوقع من رد سيرفر Azure
      // (غالباً المبرمجين بيسموه prediction أو prediction_index)
      // لو الكود ضرب هنا، بص على سطر الـ console.log اللي فوق وشوف اسم الـ key إيه بالظبط وعدله
      const predictedIndex = response.data.prediction || response.data.prediction_index || response.data[0]; 

      return { prediction: predictedIndex };
      
    } catch (error) {
      console.error("❌ Azure AI Service Error:", error.message);
      if (error.response) {
        console.error("Azure Error Details:", error.response.data);
      }
      throw new Error("Failed to get prediction from AI model.");
    }
  }
}

// Export a single instance (Singleton)
module.exports = new AiService();
