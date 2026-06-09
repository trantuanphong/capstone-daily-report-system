import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Email via custom SMTP credentials
  app.post("/api/send-email", async (req, res) => {
    const { smtpUser, smtpPass, smtpHost, smtpPort, to, subject, body } = req.body;

    if (!smtpUser || !smtpPass || !to || !subject || !body) {
      return res.json({ success: false, error: "Missing required parameters for email sending" });
    }

    try {
      const portNumber = Number(smtpPort) || 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost || "smtp.gmail.com",
        port: portNumber,
        secure: portNumber === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${smtpUser.split('@')[0]}" <${smtpUser}>`,
        to: to,
        subject: subject,
        text: body,
      });

      console.log("Email sent successfully: ", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("SMTP Mail Send Error:", error);
      let errorMessage = error.message || "Failed to send email via SMTP";
      
      // Pinpoint exact root cause for Gmail SMTP 535 rejection
      if (errorMessage.includes("535-5.7.8") || errorMessage.toLowerCase().includes("username and password not accepted")) {
        errorMessage = "Lỗi xác thực SMTP (Mã lỗi 535-5.7.8): Tài khoản hoặc Mật khẩu không chính xác. ĐẶC BIỆT LƯU Ý: Nếu bạn sử dụng Gmail gửi SMTP, bạn BẮT BUỘC phải bật Xác minh 2 bước trên Gmail đó, sau đó tạo và điền 'Mật khẩu ứng dụng' (App Password - gồm 16 ký tự viết liền) chứ KHÔNG ĐƯỢC sử dụng mật khẩu đăng nhập tài khoản thông thường.";
      }
      
      res.json({ success: false, error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
