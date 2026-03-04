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
  async analyzePersonality(answers) {
    // 1. Reshape from Vector (1D) to Matrix (2D)
    // الإجابات جاية كده: [1, 5, 3, ...]
    // الموديل عايزها كده: [[1, 5, 3, ...]]
    const reshapedAnswers = [answers];

    // --------------------------------------------------------
    // 🟢 MOCK MODE: وضع المحاكاة (يُستخدم حالياً للتطوير)
    // --------------------------------------------------------
    console.log('🤖 [MOCK] AI Service received Matrix:', reshapedAnswers);

    // محاكاة تأخير الشبكة (1 ثانية) عشان الفرونت إند يختبر الـ Loader
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // توليد رقم عشوائي من 0 إلى 15 (يمثل الـ 16 شخصية)
    const mockPredictionIndex = Math.floor(Math.random() * 16);
    console.log(`[MOCK] AI Model predicted index: ${mockPredictionIndex}`);

    return { prediction: mockPredictionIndex };

    // --------------------------------------------------------
    // 🔴 REAL MODE: وضع الإنتاج (يُفعل عند استلام رابط Azure)
    // --------------------------------------------------------
    /*
    return await this._request("POST", "/predict-mbti", { 
      features: reshapedAnswers 
    });
    */
  }
}

// Export a single instance (Singleton)
module.exports = new AiService();
