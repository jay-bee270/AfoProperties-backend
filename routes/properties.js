const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

// GET all properties (with filters)
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

// GET a single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new property (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE a property (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a property (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;