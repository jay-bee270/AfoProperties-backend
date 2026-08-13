const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'AfoProperties' },
  companyEmail: { type: String, default: 'jubrilo2007@gmail.com' },
  companyPhone: { type: String, default: '+234 (0) 701 123 4567' },
  companyAddress: { type: String, default: 'Lekki Phase 1, Lagos, Nigeria' },
  aboutText: { type: String, default: "Nigeria's trusted real estate platform." },
  socialLinks: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
  },
  inquirySubjects: {
    type: [String],
    default: ['Rental Inquiry', 'Purchase Inquiry', 'Mortgage/Investment', 'Booking Inspection', 'Feedback', 'Other']
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);