require("dotenv").config({ path: "../../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const analyticsRoutes = require("./routes/analytics");
const rulesRoutes = require("./routes/rules");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/analytics", analyticsRoutes);
app.use("/rules", rulesRoutes);
app.get("/health", (req, res) => res.json({ status: "Analytics service running" }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Analytics Service connected to MongoDB");
    app.listen(process.env.ANALYTICS_SERVICE_PORT, () => {
      console.log(`🚀 Analytics Service running on port ${process.env.ANALYTICS_SERVICE_PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB error:", err));
