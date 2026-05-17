const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'donotreply.dobium@gmail.com',
    pass: process.env.EMAIL_PASS // Use a Gmail App Password here
  }
});

async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Dobium Admin" <${process.env.EMAIL_USER || 'donotreply.dobium@gmail.com'}>`,
      to,
      subject,
      text,
      html
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendEmail };