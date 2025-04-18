/** @format */

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    school_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "schools",
    },
    first_name: {
      type: String,
      required: [true, "First name is required"],
    },
    last_name: {
      type: String,
      required: [true, "Last name is required"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
    },
    password: {
      type: String,

      required: [true, "password is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    points: {
      type: Number,
      default: 0,
    },
    has_badge: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    topics: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "topics",
      default: [],
    },
    savedForums: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "forums",
      default: [],
    },
    profilePicture: {
      type: String,
      default: null, // Store Cloudinary URL or null if no picture
    },
    profilePicturePublicId: {
      type: String,
      default: null, // Stores Cloudinary's publicId for deletion
    },
  },
  { timestamps: true }
);

const Users = mongoose.model("users", UserSchema);

module.exports = Users;
