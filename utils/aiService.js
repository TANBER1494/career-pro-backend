const axios = require("axios");
const AppError = require("./AppError");

class AiService {
  constructor() {
    this.client = axios.create({
      // 💡 التعديل هنا: وضع رابط Azure كرابط أساسي للذكاء الاصطناعي
      baseURL: process.env.AI_SERVICE_URL || "https://careerpro-api-accub9c9gncuewd7.swedencentral-01.azurewebsites.net",
      timeout: 15000, // زودنا الوقت لـ 15 ثانية تحسباً لبطء سيرفرات الـ AI المجانية
      headers: {
        "Content-Type": "application/json",
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

      if (error.code === "ECONNREFUSED") {
        throw new AppError("AI Service is currently unavailable. Please try again later.", 503);
      }

      if (error.response) {
        console.error("AI Server Details:", error.response.data); // مفيد جداً للـ Debugging
        throw new AppError(error.response.data.message || "Error processing request by AI.", error.response.status);
      }

      throw new AppError("Internal Server Error during AI communication.", 500);
    }
  }

  // ============================================================
  // 🚀 Personality Test AI Integration (REAL AZURE MODE)
  // ============================================================
  async analyzePersonality(answers) {
    try {
      console.log("🚀 Sending Vector to Azure AI:", answers);

      // استخدام this._request بدلاً من axios.post المباشر عشان نستفيد من إعدادات الـ client
      const responseData = await this._request("POST", "/predict", {
        features: answers,
      });

      console.log("✅ AZURE RESPONSE:", responseData);

      // استخراج النتيجة (سواء كانت prediction أو index 0)
      const predictedIndex = responseData.prediction || responseData.prediction_index || responseData[0];

      return { prediction: predictedIndex };
    } catch (error) {
      console.error("❌ Failed to analyze personality:", error);
      throw error; // رمي الخطأ للـ Controller عشان يرجعه للفرونت إند
    }
  }

  // سيتم إضافة الدوال الأخرى هنا لاحقاً (analyzeCV, matchJobs)
}

module.exports = new AiService();