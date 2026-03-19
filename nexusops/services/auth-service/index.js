require("dotenv").config({ path: "../../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.get("/health", (req, res) => res.json({ status: "Auth service running" }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Auth Service connected to MongoDB");
    app.listen(process.env.AUTH_SERVICE_PORT, () => {
      console.log(`🚀 Auth Service running on port ${process.env.AUTH_SERVICE_PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB error:", err));
