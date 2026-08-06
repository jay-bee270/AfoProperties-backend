const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const resend = require('../config/email');

/**
 * @swagger
 * /api/inquiries:
 *   post:
 *     summary: Send a new inquiry (contact form, optionally linked to a property)
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
 *               property:
 *                 type: string
 *                 description: Optional property ID, if the inquiry is about a specific listing
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Property not found (if a property id was provided)
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, property } = req.body;

    // If a property id was provided, validate it exists
    let propertyDoc = null;
    if (property) {
      propertyDoc = await Property.findById(property);
      if (!propertyDoc) return res.status(404).json({ error: 'Property not found' });
    }

    // Save to database
    const inquiry = await Inquiry.create({ name, email, phone, subject, message, property: property || undefined });

    // Notify the company — reply-to is the client, so replying goes straight to them
    resend.emails.send({
      from: 'AfoProperties <onboarding@resend.dev>',
      to: process.env.COMPANY_EMAIL,
      replyTo: email,
      subject: `New Inquiry: ${subject}`,
      html: `
        <h2>New Inquiry from AfoProperties Website</h2>
        ${propertyDoc ? `
          <p><strong>Regarding Property:</strong> ${propertyDoc.title}</p>
          <p><strong>Location:</strong> ${propertyDoc.location}</p>
          <hr/>
        ` : ''}
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

    res.status(201).json({ message: 'Message sent successfully!', inquiry });
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
    const inquiries = await Inquiry.find().populate('property').sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;