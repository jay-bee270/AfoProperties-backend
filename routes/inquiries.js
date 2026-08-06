const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const resend = require('../config/email');

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

    // Notify the company — reply-to is the client, so replying goes straight to them
    resend.emails.send({
      from: 'AfoProperties <onboarding@resend.dev>',
      to: process.env.COMPANY_EMAIL,
      replyTo: email,
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
    }).catch(err => console.error('❌ Inquiry notification email failed:', err.message));

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