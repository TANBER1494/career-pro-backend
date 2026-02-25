const { Resend } = require('resend');

// تهيئة مكتبة Resend باستخدام مفتاح الأمان من البيئة
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  // تصميم الـ HTML الاحترافي الخاص بك (لم نغيره)
  const defaultHtmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #2563eb; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
        .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
        .message-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px dashed #cbd5e1; }
        .code { font-size: 32px; font-weight: 700; color: #2563eb; letter-spacing: 5px; margin: 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AI-Career Guidance</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hello,</p>
          <p style="margin-bottom: 20px;">We received a request to verify your account or reset your password. Use the code below to complete the process:</p>
          
          <div class="message-box">
            <span class="code">${options.message}</span>
          </div>
          
          <p style="font-size: 14px; color: #64748b;">This code is valid for <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} AI-Career Guidance. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // إرسال الإيميل باستخدام Resend
  const { data, error } = await resend.emails.send({
    from: `CareerPro Team <${process.env.EMAIL_FROM}>`, // اسم مرسل احترافي + الإيميل الموثق
    to: options.email,
    subject: options.subject,
    text: options.message, // نسخة نصية عادية تحسباً لأي خطأ في عرض الـ HTML
    html: options.html || defaultHtmlTemplate, 
  });

  // معالجة الأخطاء لو حدثت مشكلة في الإرسال
  if (error) {
    console.error("Resend Error details:", error);
    throw new Error('Email could not be sent. Please try again later.');
  }

  return data;
};

module.exports = sendEmail;