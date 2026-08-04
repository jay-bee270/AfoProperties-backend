const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  size: { type: Number, default: 0 },
  type: { type: String, enum: ['rent', 'sale', 'mortgage'], required: true },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  featured: { type: Boolean, default: false },
  isNewListing: { type: Boolean, default: false },
  isHotDeal: { type: Boolean, default: false },
  images: [String],
  videos: [String],
  amenities: [String],
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);