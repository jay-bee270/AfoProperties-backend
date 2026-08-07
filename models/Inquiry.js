const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }, // optional
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);