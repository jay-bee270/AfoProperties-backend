const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const bcrypt = require('bcrypt');

// GET my profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE my profile (username, email)
router.put('/me', protect, async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { username, email },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profile updated!', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CHANGE my password
router.put('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Current password is wrong' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword });
    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE my account
router.delete('/me', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ message: 'Account deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all users (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single user (admin only)
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a user (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;