const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// POST a new booking
router.post('/', protect, async (req, res) => {
  try {
    const booking = await Booking.create({ ...req.body, user: req.userId });
    res.status(201).json({ message: 'Booking request sent!', booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET my bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId }).populate('property');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all bookings (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('property').populate('user', 'username email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;