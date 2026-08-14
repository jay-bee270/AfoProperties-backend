const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *                 example: "08012345678"
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Email or username already in use
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, email, phone, password: hashedPassword });
    res.status(201).json({ message: 'Account created successfully!' });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already in use` });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to your account with either email or username
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email:
 *                 type: string
 *                 description: Provide this OR username, not both
 *               username:
 *                 type: string
 *                 description: Provide this OR email, not both
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       400:
 *         description: Neither email nor username was provided
 *       404:
 *         description: User not found
 *       401:
 *         description: Wrong password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email && !username) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    // Look the user up by whichever identifier was actually sent. Passing
    // an explicit key with value undefined here would make Mongo match
    // every document, so we build the filter conditionally instead.
    const user = await User.findOne(email ? { email } : { username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Wrong password' });

    // Update last login time and use the returned document so the
    // response reflects the actual saved value, not a fresh Date() that
    // may drift from what's in the DB.
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { lastLogin: new Date() },
      { new: true }
    );

    const token = jwt.sign(
      { userId: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        lastLogin: updatedUser.lastLogin,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;