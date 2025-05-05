/** @format */

const mongoose = require("mongoose");
const { tokenDb } = require("../models/con_db");

const tokenSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
});

module.exports = tokenDb.model("Token", tokenSchema);
