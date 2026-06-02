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
      return res.status(400).json({ error: "Missing required parameters for email sending" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost || "smtp.gmail.com",
        port: smtpPort || 465,
        secure: smtpPort === 465 || !smtpPort, // true for 465, false for other ports
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
      res.status(500).json({ error: error.message || "Failed to send email via SMTP" });
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
