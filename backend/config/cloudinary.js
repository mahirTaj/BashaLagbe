const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'basha-lagbe-listings',
    format: async (req, file) => {
        if (file.mimetype.startsWith('video/')) {
            return 'mp4';
        }
        return 'jpg';
    },
    public_id: (req, file) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
        return `${Date.now()}_${safeName}`;
    },
    resource_type: 'auto',
  },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit for any file
});

module.exports = {
    cloudinary,
    upload
};
