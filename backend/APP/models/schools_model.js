/** @format */

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const SchoolSchema = new Schema(
  {
    school_name: {
      type: String,
      required: [true, "School name is required"],
    },
    email_domain: {
      type: String,
      required: [true, "Email domain is required"],
    },
    points: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("schools", SchoolSchema);
