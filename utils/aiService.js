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


 // ============================================================
  // CV Analyzer & ATS Checker (REAL AZURE MODE)
  // ============================================================
  async analyzeCV(cvUrl, jobDescription) {
    try {
      console.log("🚀 [REAL MODE] Sending CV to Azure AI...");
      
      // 1. تجهيز الـ Payload بنفس المفاتيح (Keys) المتفق عليها في العقد تماماً
      const payload = {
        cv_url: cvUrl,
        job_description: jobDescription
      };

      // 2. إرسال الطلب لسيرفر الـ AI
      // نفترض هنا أن تيم الـ AI سيسمي المسار '/analyze-cv'
      // (إذا أعطوك مساراً آخر مثل '/evaluate' يمكنك تغييره هنا ببساطة)
      const response = await this._request('POST', '/analyze-cv', payload);

      console.log("✅ [AZURE RESPONSE - CV ANALYZER]:", response);

      // 3. إرجاع النتيجة كما هي للكنترولر (والتي ستحتوي على ats_score والتوصيات)
      return response;
      
    } catch (error) {
      console.error("❌ Azure AI CV Analysis Error:", error.message);
      // ملاحظة: دالة _request الأساسية لديك تقوم بالفعل بالتقاط الأخطاء 
      // وتحويلها إلى AppError برموز الحالة الصحيحة (400, 500)، لذا نعيد رمي الخطأ للكنترولر
      throw error; 
    }
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
