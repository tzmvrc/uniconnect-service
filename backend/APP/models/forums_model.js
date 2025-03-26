/** @format */

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ForumSchema = new Schema(
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

    tags: {
      type: [String],
      default: [],
    },

    public: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "topics",
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
    

    likes: {
      type: Number,
      default: 0,
    },

    dislikes: {
      type: Number,
      default: 0,
    },

    liked_by: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "users",
      default: [],
    },

    disliked_by: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "users",
      default: [],
    },
  },
  { timestamps: true }
);

const Forums = mongoose.model("forums", ForumSchema);

module.exports = Forums;
