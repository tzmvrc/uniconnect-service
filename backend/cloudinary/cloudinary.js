/** @format */

const cloudinary = require("./cloudinaryConfig");
const fs = require("fs/promises");
const path = require("path");

const uploadProfileImage = async (filePath, userId) => {
  console.log("🚀 uploadProfileImage() called with:", { filePath, userId });

  if (!filePath) {
    throw new Error("File path is required");
  }

  try {
    // If filePath is already a Cloudinary URL (from Multer), return it directly
    if (filePath.startsWith("http")) {
      console.log("⚠️ File is already a Cloudinary URL. Skipping upload.");
      return {
        url: filePath,
        publicId: `profile-pictures/user_${userId}_${Date.now()}`,
      };
    }

    // Otherwise, upload manually from a local path
    const publicId = `user_${userId}_${Date.now()}`;
    console.log(`🔄 Uploading to Cloudinary with publicId: ${publicId}`);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "profile-picture",
      public_id: publicId,
      overwrite: true,
      transformation: [
        { width: 500, height: 500, crop: "fill", gravity: "face" },
        { quality: "auto:best" },
      ],
    });

    // Cleanup temp file
    await fs.unlink(filePath).catch(() => {});
    console.log("✅ Cloudinary upload successful:", result.secure_url);

    return {
      url: result.secure_url,
      publicId: `${result.folder}/${result.public_id}`,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    throw error;
  }
};

const deleteImage = async (publicId) => {
  if (!publicId) return;

  // Ensure we retain the subfolder path
  const fullPublicId = `profile-picture/${publicId}`;
  const decodedPublicId = decodeURIComponent(fullPublicId); // ✅ Fix encoding issue

  console.log(`🚀 Attempting to delete Cloudinary image: ${decodedPublicId}`);

  try {
    const result = await cloudinary.uploader.destroy(decodedPublicId);
    console.log(`✅ Cloudinary delete result:`, result);
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
  }
};





module.exports = { uploadProfileImage, deleteImage };
