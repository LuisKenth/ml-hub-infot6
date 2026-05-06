import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  console.log("Send Email - Request body:", req.body);
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing subject or message in request body",
    });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    console.error("Missing EMAIL_USER or EMAIL_PASS in .env.local");
    return res.status(500).json({
      success: false,
      error: "Missing EMAIL_USER or EMAIL_PASS",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: `"ML Hub Notification" <${emailUser}>`,
      to: emailUser,
      subject: subject,
      html: `
        <h2>Notification from ML Hub</h2>
        <p>${message}</p>
        <p><strong>Timestamp (Manila):</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error details:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}