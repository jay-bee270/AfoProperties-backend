const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  // Force IPv4 to avoid ENETUNREACH on Render
  host: 'smtp.gmail.com',
  family: 4,
  
  // Authentication
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  
  // Timeouts to prevent hanging
  connectionTimeout: 5000,   // 5 seconds
  greetingTimeout: 5000,     // 5 seconds
  socketTimeout: 10000,      // 10 seconds
  
  // TLS settings
  tls: {
    rejectUnauthorized: false, // Sometimes needed on Render
  },
});

module.exports = transporter;