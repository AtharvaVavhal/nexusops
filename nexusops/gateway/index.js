require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const AUTH_URL      = process.env.AUTH_SERVICE_URL      || "http://localhost:5001";
const TASK_URL      = process.env.TASK_SERVICE_URL      || "http://localhost:5002";
const DOC_URL       = process.env.DOC_SERVICE_URL       || "http://localhost:5003";
const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:5004";

app.use("/api/auth",      proxy(AUTH_URL,      { proxyReqPathResolver: (req) => "/auth"      + req.url }));
app.use("/api/tasks",     proxy(TASK_URL,      { proxyReqPathResolver: (req) => "/tasks"     + req.url }));
app.use("/api/docs",      proxy(DOC_URL,       { proxyReqPathResolver: (req) => "/docs"      + req.url }));
app.use("/api/analytics", proxy(ANALYTICS_URL, { proxyReqPathResolver: (req) => "/analytics" + req.url }));

app.get("/health", (req, res) => res.json({ status: "Gateway running" }));

app.listen(process.env.PORT || 8000, () => console.log("🌐 API Gateway running on port 8000"));