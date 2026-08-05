const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeouts to prevent hanging
  connectionTimeout: 5000,   // 5 seconds
  greetingTimeout: 5000,     // 5 seconds
});

module.exports = transporter;