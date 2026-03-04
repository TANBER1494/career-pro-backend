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
// ============================================================
  // 🚀 Personality Test AI Integration (REAL AZURE MODE)
  // ============================================================
  async analyzePersonality(answers) {
    try {
      // 1. إرسال المصفوفة (Vector) مباشرة كما يتوقعها مبرمجو Flask غالباً
      // لو ضربت، جرب ترجعها { data: [answers] } أو { features: answers }
      const response = await axios.post(
        "https://careerpro-api-accub9c9gncuewd7.swedencentral-01.azurewebsites.net/predict",
        answers // إرسال الـ Array مباشرة بدون Object
      );

      // 2. استخراج الرقم المتوقع 
      const predictedIndex = response.data.prediction || response.data.prediction_index || response.data[0]; 

      if (predictedIndex === undefined || predictedIndex === null) {
         throw new Error("Invalid response format from Azure AI.");
      }

      return { prediction: predictedIndex };
      
    } catch (error) {
      // 💡 التقاط الخطأ بذكاء وإرساله للـ Global Error Handler
      let errorMessage = "Failed to get prediction from AI model.";
      
      if (error.response) {
        // الموديل رفض الطلب (مثلاً 400 Bad Request)
        errorMessage = `AI Model Error: ${JSON.stringify(error.response.data)}`;
      } else if (error.code === 'ECONNABORTED') {
        // مشكلة Timeout
        errorMessage = "AI Model took too long to respond (Timeout).";
      }

      // استخدام AppError عشان Vercel يبعت الرسالة دي للفرونت إند بدل ما يكتب 500 غامضة
      throw new AppError(errorMessage, 500); 
    }
  }
}

// Export a single instance (Singleton)
module.exports = new AiService();
