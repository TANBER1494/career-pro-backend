const { Resend } = require('resend');

// تهيئة مكتبة Resend باستخدام مفتاح الأمان من البيئة
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  const defaultHtmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background-color: #4f46e5; padding: 25px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; color: #1e293b; line-height: 1.7; }
        .message-box { background-color: #f1f5f9; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e1; }
        .code { font-size: 34px; font-weight: 800; color: #4f46e5; letter-spacing: 6px; margin: 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
        .warning { font-size: 14px; color: #64748b; background-color: #fffbeb; padding: 10px; border-left: 4px solid #f59e0b; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CareerPro Security</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-top: 0; font-weight: 600;">Hi there,</p>
          <p style="margin-bottom: 20px;">You recently initiated a request to verify your account or reset your password. Please use the secure authorization code below:</p>
          
          <div class="message-box">
            <span class="code">${options.message}</span>
          </div>
          
          <p class="warning">This secure code will expire in <strong>10 minutes</strong>. For your security, do not share this code with anyone.</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CareerPro.me. All rights reserved.</p>
          <p>You received this email because a security request was made for your account.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // إرسال الإيميل باستخدام Resend
  const { data, error } = await resend.emails.send({
    from: `CareerPro Support <${process.env.EMAIL_FROM}>`, // تم تغيير اسم المرسل
    to: options.email,
    subject: `${options.subject} 🔐`, // تم إضافة إيموجي لكسر الفلتر القديم
    text: `Your secure authorization code is: ${options.message}. It expires in 10 minutes.`, // تم تغيير النص البديل
    html: options.html || defaultHtmlTemplate, 
  });

  // معالجة الأخطاء
  if (error) {
    console.error("Resend Error details:", error);
    throw new Error('Email could not be sent. Please try again later.');
  }

  return data;
};

module.exports = sendEmail;