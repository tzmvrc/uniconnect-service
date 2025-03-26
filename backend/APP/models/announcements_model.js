/** @format */

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AnnouncementSchema = new Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date, 
      default: Date.now,
      immutable: true 
    },

    updatedAt: {
      type: Date, 
      default: Date.now,
      immutable: true 
    },

    isDeleted: {
      type: Boolean,
      default: false 
    },

    deletedAt: {
      type: Date,
      default: null 
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const Announcements = mongoose.model("announcements", AnnouncementSchema);

module.exports = Announcements;
