const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ResponseSchema = new Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    forum_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "forums",
      required: true,
    },

    comment: {
      type: String,
      required: true,
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
    
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Response = mongoose.model("responses", ResponseSchema);
module.exports = Response;
