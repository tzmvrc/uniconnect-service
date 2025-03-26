/** @format */

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TopicSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Topic name is required"],
      unique: true,
      trim: true,
    },
    display: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

const Topics = mongoose.model("topics", TopicSchema);

module.exports = Topics;
