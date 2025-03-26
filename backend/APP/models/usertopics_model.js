const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserTopicSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "topics",
      required: true,
    },
    added: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserTopics = mongoose.model("UserTopics", UserTopicSchema);

module.exports = UserTopics;
