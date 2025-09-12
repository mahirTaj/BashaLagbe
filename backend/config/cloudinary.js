const cloudinaryPkg = require('cloudinary');
const cloudinary = cloudinaryPkg.v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary (if credentials present)
const hasCloudinaryCreds = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (hasCloudinaryCreds) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Basic presence checks (do not log secrets)
try {
  console.log('[cloudinary] config:', { cloud_name_present: !!process.env.CLOUDINARY_CLOUD_NAME, api_key_present: !!process.env.CLOUDINARY_API_KEY });
} catch (e) { console.error('[cloudinary] failed to log config presence', e); }

let storage;
if (hasCloudinaryCreds) {
  // Configure multer storage for Cloudinary
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'basha-lagbe-listings',
      format: async (req, file) => {
        try {
          if (file && file.mimetype && file.mimetype.startsWith('video/')) return 'mp4';
          return 'jpg';
        } catch (e) {
          console.error('[cloudinary] format error', e);
          return 'jpg';
        }
      },
      public_id: (req, file) => {
        try {
          const safeName = (file && file.originalname) ? file.originalname.replace(/[^a-zA-Z0-9]/g, '_') : 'file';
          return `${Date.now()}_${safeName}`;
        } catch (e) {
          console.error('[cloudinary] public_id error', e);
          return `${Date.now()}_file`;
        }
      },
      resource_type: 'auto',
    },
  });
} else {
  // Fallback to local disk storage when Cloudinary is not configured
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9\.\-\_]/g, '_');
      cb(null, `${Date.now()}_${safe}`);
    }
  });
  console.log('[cloudinary] No Cloudinary credentials found, using local disk storage fallback for uploads.');
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit for any file
});

module.exports = {
  cloudinary: hasCloudinaryCreds ? cloudinary : null,
  upload,
  useCloudinary: hasCloudinaryCreds,
};
