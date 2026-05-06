import nodemailer from 'nodemailer';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, deviceName } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    console.error('Missing EMAIL_USER or EMAIL_PASS in .env.local');
    return res.status(500).json({
      success: false,
      error: 'Email credentials missing. Check .env.local.',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Send the login notification to the admin (you)
    await transporter.sendMail({
      from: `"ML Hub Security" <${emailUser}>`,
      to: emailUser, // Sends the email to your Gmail account
      subject: 'Login Security Alert - ML Hub',
      html: `
        <h2>Login Security Alert</h2>
        <p>A user has successfully logged into their account.</p>
        <p><strong>User Email:</strong> ${email}</p>
        <p><strong>Device Used:</strong> ${deviceName || 'Unknown device'}</p>
        <p><strong>Date & Time (Manila):</strong> ${new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Login email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}