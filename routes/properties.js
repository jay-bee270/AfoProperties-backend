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
 */

// Helper: extract the Cloudinary public_id from a full URL so we can delete it later.
// A Cloudinary URL looks like:
// https://res.cloudinary.com/CLOUD_NAME/image/upload/v123456/afoproperties/abc123.jpg
// The public_id we need for deletion is: afoproperties/abc123
function extractPublicId(url) {
  try {
    const parts = url.split('/upload/')[1]; // v123456/afoproperties/abc123.jpg
    const withoutVersion = parts.split('/').slice(1).join('/'); // afoproperties/abc123.jpg
    return withoutVersion.substring(0, withoutVersion.lastIndexOf('.')); // afoproperties/abc123
  } catch {
    return null;
  }
}

// Helper: delete a list of Cloudinary URLs (images or videos) from Cloudinary storage
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
    const { type, status, location, minPrice, maxPrice, bedrooms, featured } = req.query;
    let filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (featured) filter.featured = featured === 'true';
    if (bedrooms) filter.bedrooms = Number(bedrooms);
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
 *     summary: Upload images/videos for a property (admin only) — returns Cloudinary URLs
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
 *                 example: sale
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
 *     summary: Update a property (admin only) — removes any images/videos no longer in the new list from Cloudinary
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Property not found
 */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existing = await Property.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Property not found' });

    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If images/videos were included in the update, figure out which old ones
    // are no longer present in the new list, and delete those from Cloudinary
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
 *     summary: Delete a property (admin only) — also removes its images/videos from Cloudinary
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

    // Clean up Cloudinary storage in the background, don't block the response
    deleteFromCloudinary(property.images, 'image');
    deleteFromCloudinary(property.videos, 'video');

    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;