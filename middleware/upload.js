const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Cloudinary automatically detects whether a file is an image or video
// when resource_type is set to 'auto'
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'afoproperties',
    resource_type: 'auto', // handles both images and videos
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi', 'webm'],
  },
});

// Limit file size to 50MB (videos are bigger than images, adjust as needed)
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;