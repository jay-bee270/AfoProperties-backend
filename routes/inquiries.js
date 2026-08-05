const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const transporter = require('../config/email');

/**
 * @swagger
 * /api/inquiries:
 *   post:
 *     summary: Send a new inquiry (contact form)
 *     tags: [Inquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               subject:
 *                 type: string
 *                 example: Interested in Lekki duplex
 *               message:
 *                 type: string
 *                 example: I'd like to schedule a viewing this weekend.
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid data
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Save to database
    const inquiry = await Inquiry.create({ name, email, phone, subject, message });

    // Send emails in background
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Inquiry: ${subject}`,
      html: `
        <h2>New Inquiry from AfoProperties Website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr/>
        <p>Reply directly to this email to respond to ${name}.</p>
      `,
      replyTo: email,
    }).catch(err => console.error('❌ Inquiry email failed:', err.message));

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'We received your message — AfoProperties',
      html: `
        <h2>Hello ${name},</h2>
        <p>Thank you for reaching out to AfoProperties!</p>
        <p>We have received your message and will get back to you within 24 hours.</p>
        <br/>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>AfoProperties Team</strong></p>
        <p>Lagos, Nigeria</p>
      `,
    }).catch(err => console.error('❌ Auto-reply failed:', err.message));

    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inquiries:
 *   get:
 *     summary: Get all inquiries (admin only)
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of inquiries
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;