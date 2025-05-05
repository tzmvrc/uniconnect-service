/** @format */

require("dotenv").config();
const mongoose = require("mongoose");

// Connect main DB using mongoose.connect
const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("✅ Connected to Main DB"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));
};

// Token DB connection using createConnection
const tokenDb = mongoose.createConnection(process.env.MONGO_TOKEN, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

tokenDb.on("connected", () => {
  console.log("✅ Connected to Token DB");
});

tokenDb.on("error", (err) => {
  console.error("❌ Token DB Connection Error:", err);
});

module.exports = { connectDB, tokenDb };
