/** @format */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  }, // ✅ Change "User" -> "users"
  type: {
    type: String,
    enum: [
      "forum_like",
      "forum_dislike",
      "forum_response",
      "response_like",
      "response_dislike",
    ],
    required: true,
  },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sourceType: { type: String, enum: ["forum", "response"], required: true },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  }, // ✅ Change "User" -> "users"
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
