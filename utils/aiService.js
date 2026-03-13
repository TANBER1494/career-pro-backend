const axios = require('axios');
const AppError = require('./AppError');

class AiService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000',
      // 🚨 التعديل الأهم: رفعنا الـ Timeout لـ 35 ثانية بناءً على تعليمات تيم الـ AI
      // لإعطاء موديل الـ LLM الوقت الكافي لقراءة الـ CV وتحليله
      timeout: 35000, 
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async _request(method, endpoint, data = {}) {
    try {
      const response = await this.client({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error) {
      console.error(`AI Service Error [${endpoint}]:`, error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new AppError('AI Service is currently unavailable. Please try again later.', 503);
      }
      
      // إذا تخطى الـ 35 ثانية
      if (error.code === 'ECONNABORTED') {
        throw new AppError('AI Analysis took too long (Timeout). The document might be too complex.', 504);
      }

      if (error.response) {
        throw new AppError(
          error.response.data.error || error.response.data.message || 'Error processing request by AI.',
          error.response.status
        );
      }

      throw new AppError('Internal Server Error during AI communication.', 500);
    }
  }

  // ============================================================
  // 🚀 CV Analyzer & ATS Checker (REAL AZURE MODE)
  // ============================================================
  async analyzeCV(cvUrl, jobDescription) {
    try {
      console.log("🚀 [REAL MODE] Sending CV to Azure AI...");
      
      // 1. المفاتيح المتفق عليها تماماً
      const payload = {
        cv_url: cvUrl,
        job_description: jobDescription
      };

      // 2. الرابط المباشر الجديد لخدمة الـ CV
      const endpoint = 'https://cv-insight-engine-d7fcb9d3cfcqhfge.swedencentral-01.azurewebsites.net/analyze_resume';
      
      // 3. إرسال الطلب (سيتوقف هنا لمدة تصل لـ 25 ثانية)
      const response = await this._request('POST', endpoint, payload);

      console.log("✅ [AZURE RESPONSE - RAW]:", response);

      // 4. استخراج الداتا بناءً على الهيكل (status, data) الذي أرسلته بسملة
      if (response.status === 'success' && response.data) {
        // نُرجع الـ data الصافية (التي تحتوي على ats_score, keywords_analysis, etc.) للكنترولر
        return response.data; 
      } else {
        throw new Error(response.error || "AI returned an invalid structure.");
      }
      
    } catch (error) {
      console.error("❌ Azure AI CV Analysis Error:", error.message);
      throw error; 
    }
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
        { answers: mappedAnswers }
      );

      console.log("✅ [AZURE RESPONSE]:", response.data);
      const mbtiCode = response.data.personality; 
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

module.exports = new AiService();