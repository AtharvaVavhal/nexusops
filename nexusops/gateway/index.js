require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", proxy("http://localhost:5001", {
  proxyReqPathResolver: (req) => "/auth" + req.url
}));

app.use("/api/tasks", proxy("http://localhost:5002", {
  proxyReqPathResolver: (req) => "/tasks" + req.url
}));

app.use("/api/docs", proxy("http://localhost:5003", {
  proxyReqPathResolver: (req) => "/docs" + req.url
}));

app.use("/api/analytics", proxy("http://localhost:5004", {
  proxyReqPathResolver: (req) => "/analytics" + req.url
}));

app.get("/health", (req, res) => res.json({ status: "Gateway running" }));

app.listen(8000, () => console.log("🌐 API Gateway running on port 8000"));
