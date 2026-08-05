const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Force IPv4 to avoid ENETUNREACH on Render
  host: 'smtp.gmail.com',
  family: 4,
  // Timeouts to prevent hanging
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;