const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// Helper — get or create settings (there's always only one settings document)
const getSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
};

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get site settings (public)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Site settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update site settings (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *               companyEmail:
 *                 type: string
 *               companyPhone:
 *                 type: string
 *               companyAddress:
 *                 type: string
 *               aboutText:
 *                 type: string
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   facebook:
 *                     type: string
 *                   twitter:
 *                     type: string
 *                   instagram:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *               inquirySubjects:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Settings updated
 *       403:
 *         description: Admins only
 */
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const settings = await getSettings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ message: 'Settings updated!', settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;