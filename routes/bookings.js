const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const resend = require('../config/email');

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [property, date]
 *             properties:
 *               property:
 *                 type: string
 *                 description: Property ID
 *               date:
 *                 type: string
 *                 description: Inspection date (format d/m/y e.g 15/05/2026)
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking request sent
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Property not found
 */
router.post('/', protect, async (req, res) => {
  try {
    let { property, date, message } = req.body;

    // Validate property exists
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) return res.status(404).json({ error: 'Property not found' });

    // Convert d/m/y to proper date format
    if (date && date.includes('/')) {
      const [day, month, year] = date.split('/');
      date = new Date(`${year}-${month}-${day}`);
    }

    // Reject booking dates in the past
    const parsedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // compare by calendar day, not time of day
    if (parsedDate < today) {
      return res.status(400).json({ error: 'Booking date cannot be in the past' });
    }

    // Get user details for the notification email
    const user = await User.findById(req.userId);

    // Save to database
    const booking = await Booking.create({ property, date, message, user: req.userId });

    // Notify the company — reply-to is the client, so replying goes straight to them
    resend.emails.send({
      from: 'AfoProperties <onboarding@resend.dev>',
      to: process.env.COMPANY_EMAIL,
      replyTo: user.email,
      subject: `New Booking Request — ${propertyDoc.title}`,
      html: `
        <h2>New Booking Request on AfoProperties</h2>
        <p><strong>Property:</strong> ${propertyDoc.title}</p>
        <p><strong>Location:</strong> ${propertyDoc.location}</p>
        <p><strong>Price:</strong> ₦${propertyDoc.price.toLocaleString()}</p>
        <hr/>
        <p><strong>Client Name:</strong> ${user.username}</p>
        <p><strong>Client Email:</strong> ${user.email}</p>
        <p><strong>Inspection Date:</strong> ${new Date(date).toDateString()}</p>
        <p><strong>Message:</strong> ${message || 'No message provided'}</p>
        <hr/>
        <p>Reply directly to this email to respond to ${user.username}.</p>
      `,
    }).catch(err => console.error('❌ Booking notification email failed:', err.message));

    // Respond immediately, don't wait on email
    res.status(201).json({ message: 'Booking request sent!', booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get my bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my bookings
 */
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId }).populate('property');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('property')
      .populate('user', 'username email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled]
 *     responses:
 *       200:
 *         description: Booking status updated
 *       404:
 *         description: Booking not found
 *       403:
 *         description: Admins only
 */
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('property')
      .populate('user', 'username email');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = status;
    await booking.save();

    res.json({ message: `Booking marked as ${status}`, booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;