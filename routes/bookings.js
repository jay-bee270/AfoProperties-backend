const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

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
 *             properties:
 *               property:
 *                 type: string
 *                 description: Property ID
 *               date:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking request sent
 *       400:
 *         description: Invalid data
 */
router.post('/', protect, async (req, res) => {
  try {
    const booking = await Booking.create({ ...req.body, user: req.userId });
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
    const bookings = await Booking.find().populate('property').populate('user', 'username email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;