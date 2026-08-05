const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const transporter = require('../config/email');

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

    // Get user details for email
    const User = require('../models/User');
    const user = await User.findById(req.userId);

    // Save to database
    const booking = await Booking.create({ property, date, message, user: req.userId });

    // Email to company
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
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
        <p>Log in to the admin dashboard to confirm or cancel this booking.</p>
      `,
      replyTo: user.email,
    });

    // Auto-reply to user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Booking Request Received — AfoProperties',
      html: `
        <h2>Hello ${user.username},</h2>
        <p>Your inspection booking request has been received!</p>
        <br/>
        <p><strong>Property:</strong> ${propertyDoc.title}</p>
        <p><strong>Location:</strong> ${propertyDoc.location}</p>
        <p><strong>Inspection Date:</strong> ${new Date(date).toDateString()}</p>
        <p><strong>Status:</strong> Pending</p>
        <br/>
        <p>Our team will review your request and confirm or cancel it shortly.</p>
        <p>You will receive another email once your booking status is updated.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>AfoProperties Team</strong></p>
        <p>Lagos, Nigeria</p>
      `,
    });

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
 *                 enum: [confirmed, cancelled]
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

    const booking = await Booking.findById(req.params.id)
      .populate('property')
      .populate('user', 'username email');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = status;
    await booking.save();

    // Email to user about status update
    const statusMessage = status === 'confirmed'
      ? `Your inspection has been <strong>confirmed</strong>! We look forward to seeing you.`
      : `Unfortunately your inspection has been <strong>cancelled</strong>. Please contact us to reschedule.`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: booking.user.email,
      subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)} — AfoProperties`,
      html: `
        <h2>Hello ${booking.user.username},</h2>
        <p>${statusMessage}</p>
        <br/>
        <p><strong>Property:</strong> ${booking.property.title}</p>
        <p><strong>Location:</strong> ${booking.property.location}</p>
        <p><strong>Inspection Date:</strong> ${new Date(booking.date).toDateString()}</p>
        <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>AfoProperties Team</strong></p>
        <p>Lagos, Nigeria</p>
      `,
    });

    res.json({ message: `Booking ${status} successfully!`, booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;