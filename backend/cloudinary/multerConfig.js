/** @format */

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinaryConfig");

// Improved Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Generate unique filename with user ID and timestamp
    const userId = req.user?.userId || "unknown";
    const timestamp = Date.now();
    const originalName = file.originalname.split(".")[0];
    const publicId = `profile-pictures/${userId}_${timestamp}_${originalName}`;

    return {
      folder: "profile-picture",
      public_id: publicId,
      allowed_formats: ["jpg", "png", "jpeg", "webp"], // Added webp support
      transformation: [
        { width: 500, height: 500, crop: "limit", quality: "auto" }, // Auto-resize and optimize
        { fetch_format: "auto" }, // Auto-choose best format
      ],
      resource_type: "image",
    };
  },
});

// Enhanced Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, and PNG images are allowed."
        ),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file
  },
  onError: (err, next) => {
    console.error("Multer Error:", err);
    next(err);
  },
});

// Middleware to handle upload errors properly
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Max 5MB allowed."
          : "File upload error",
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed",
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadErrors,
};
