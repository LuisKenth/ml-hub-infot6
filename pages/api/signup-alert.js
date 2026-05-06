import nodemailer from "nodemailer";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email address",
    });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    return res.status(500).json({
      success: false,
      error: "Missing EMAIL_USER or EMAIL_PASS in .env.local",
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

    // 1. Send confirmation email to the user
    await transporter.sendMail({
      from: `"ML Hub" <${emailUser}>`,
      to: email, // Sent to the user who signed up
      subject: "Welcome to ML Hub - Account Confirmation",
      html: `
        <h2>Welcome to ML Hub!</h2>
        <p>Your account has been successfully created using this email address.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>If you did not sign up for this account, please let us know immediately.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>
      `,
    });

    // 2. Send notification to the Admin
    await transporter.sendMail({
      from: `"ML Hub Security" <${emailUser}>`,
      to: emailUser, // Sent to the admin
      subject: "New Signup Notification - ML Hub",
      html: `
        <h2>New User Signup</h2>
        <p>A new user registered.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Signup email error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}