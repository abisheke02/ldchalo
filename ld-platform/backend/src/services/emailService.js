const nodemailer = require('nodemailer');

const isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const APP_URL = process.env.APP_URL || 'http://localhost';

const sendStudentInvite = async ({ toEmail, studentName, className, schoolName, token }) => {
  const link = `${APP_URL}/student-invite/${token}`;

  if (!isConfigured) {
    console.log(`[EMAIL INVITE — no SMTP configured]`);
    console.log(`  To: ${toEmail}`);
    console.log(`  Link: ${link}`);
    return { preview: link };
  }

  await transporter.sendMail({
    from: `"LD Support Platform" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You've been added to ${className} — Set your password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e40af">Welcome to LD Support Platform!</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your teacher has added you to <strong>${className}</strong> at <strong>${schoolName}</strong>.</p>
        <p>Click the button below to set your password and start learning:</p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0">
          Set My Password
        </a>
        <p style="color:#64748b;font-size:13px">This link expires in 24 hours.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">If you didn't expect this email, ignore it.</p>
      </div>
    `,
  });

  return { sent: true };
};

module.exports = { sendStudentInvite };
