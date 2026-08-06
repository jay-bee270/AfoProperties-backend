const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Connect to MongoDB with timeout
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Fail after 5s instead of 30s
})
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => {
    console.log('❌ MongoDB Connection Failed:', err.message);
    console.log('Please check your MONGO_URI and IP whitelist.');
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'AfoProperties API is running!' });
});

// Test DB route
app.get('/test-db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ message: '✅ Database is alive!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Email route (temporary) — now using Resend instead of Gmail SMTP
const resend = require('./config/email');
app.get('/test-email', async (req, res) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'AfoProperties <onboarding@resend.dev>',
      to: process.env.COMPANY_EMAIL,
      subject: 'Test Email',
      text: 'If you see this, Resend is working!',
    });
    if (error) return res.status(500).json({ error });
    res.json({ message: '✅ Email sent successfully!', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));