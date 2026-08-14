const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         location:
 *           type: string
 *         price:
 *           type: number
 *           description: Base price (used for sale/mortgage properties)
 *         bedrooms:
 *           type: number
 *         bathrooms:
 *           type: number
 *         size:
 *           type: number
 *         type:
 *           type: string
 *           enum: [rent, sale, mortgage]
 *         status:
 *           type: string
 *           enum: [available, sold]
 *         featured:
 *           type: boolean
 *         isNewListing:
 *           type: boolean
 *         isHotDeal:
 *           type: boolean
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         videos:
 *           type: array
 *           items:
 *             type: string
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *         rentalPeriod:
 *           type: string
 *           enum: [day, month, year]
 *           description: Only for rent properties — defines the billing period
 *         pricePerPeriod:
 *           type: number
 *           description: Price per day/month/year depending on rentalPeriod
 *         minDuration:
 *           type: number
 *           description: Minimum rental duration (e.g. 1 day, 1 month)
 *         maxDuration:
 *           type: number
 *           description: Maximum rental duration (e.g. 30 days, 12 months)
 */

// Helper to extract Cloudinary public_id from URL
function extractPublicId(url) {
  try {
    const parts = url.split('/upload/')[1];
    const withoutVersion = parts.split('/').slice(1).join('/');
    return withoutVersion.substring(0, withoutVersion.lastIndexOf('.'));
  } catch {
    return null;
  }
}

// Helper to delete files from Cloudinary
async function deleteFromCloudinary(urls = [], resourceType = 'image') {
  for (const url of urls) {
    const publicId = extractPublicId(url);
    if (!publicId) continue;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.error(`❌ Failed to delete ${publicId} from Cloudinary:`, err.message);
    }
  }
}

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties (with optional filters)
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [rent, sale, mortgage]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, sold]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: rentalPeriod
 *         schema:
 *           type: string
 *           enum: [day, month, year]
 *         description: Filter rent properties by billing period
 *     responses:
 *       200:
 *         description: List of properties
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, location, minPrice, maxPrice, bedrooms, featured, rentalPeriod } = req.query;
    let filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (featured) filter.featured = featured === 'true';
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (rentalPeriod) filter.rentalPeriod = rentalPeriod;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const properties = await Property.find(filter).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/properties/upload:
 *   post:
 *     summary: Upload images/videos for a property (admin only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files uploaded, returns array of URLs
 *       400:
 *         description: Upload failed
 */
router.post('/upload', protect, adminOnly, upload.array('files', 15), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const urls = req.files.map((file) => file.path);
    res.json({ urls });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get a single property
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property (admin only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, location, price, type]
 *             properties:
 *               title:
 *                 type: string
 *                 example: 3 Bedroom Duplex
 *               location:
 *                 type: string
 *                 example: Lekki, Lagos
 *               price:
 *                 type: number
 *                 example: 25000000
 *                 description: Base price (for sale/mortgage). For rent use pricePerPeriod
 *               bedrooms:
 *                 type: number
 *                 example: 3
 *               bathrooms:
 *                 type: number
 *                 example: 2
 *               size:
 *                 type: number
 *                 example: 350
 *               type:
 *                 type: string
 *                 enum: [rent, sale, mortgage]
 *                 example: rent
 *               status:
 *                 type: string
 *                 enum: [available, sold]
 *                 example: available
 *               featured:
 *                 type: boolean
 *                 example: true
 *               isNewListing:
 *                 type: boolean
 *                 example: false
 *               isHotDeal:
 *                 type: boolean
 *                 example: false
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs returned from /api/properties/upload
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs returned from /api/properties/upload
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *                 example: Spacious duplex with modern finishing
 *               rentalPeriod:
 *                 type: string
 *                 enum: [day, month, year]
 *                 description: Only for rent properties — defines the billing period
 *                 example: month
 *               pricePerPeriod:
 *                 type: number
 *                 description: Price per day/month/year
 *                 example: 150000
 *               minDuration:
 *                 type: number
 *                 description: Minimum rental duration
 *                 example: 1
 *               maxDuration:
 *                 type: number
 *                 description: Maximum rental duration (30 for days, 12 for months)
 *                 example: 12
 *     responses:
 *       201:
 *         description: Property created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid data
 */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update a property (admin only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: Property updated
 *       404:
 *         description: Property not found
 */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Property not found' });

    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (req.body.images) {
      const removedImages = existing.images.filter(img => !req.body.images.includes(img));
      deleteFromCloudinary(removedImages, 'image');
    }
    if (req.body.videos) {
      const removedVideos = existing.videos.filter(vid => !req.body.videos.includes(vid));
      deleteFromCloudinary(removedVideos, 'video');
    }

    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete a property (admin only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property deleted
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    deleteFromCloudinary(property.images, 'image');
    deleteFromCloudinary(property.videos, 'video');

    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;