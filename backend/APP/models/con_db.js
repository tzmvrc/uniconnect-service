/** @format */

// Import Mongoose
require("dotenv").config();
const mongoose = require("mongoose");


const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));
};

module.exports = { connectDB };
