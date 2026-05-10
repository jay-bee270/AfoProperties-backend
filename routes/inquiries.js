const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// POST a new inquiry (contact form)
router.post('/', async (req, res) => {
  try {
    const inquiry = await Inquiry.create(req.body);
    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET all inquiries (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;