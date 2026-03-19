require("dotenv").config({ path: "../../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("./models/User");
const taskRoutes = require("./routes/tasks");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

app.use(cors());
app.use(express.json());

// Attach io to every request
app.use((req, res, next) => { req.io = io; next(); });
app.use("/tasks", taskRoutes);
app.get("/health", (req, res) => res.json({ status: "Task service running" }));

// Socket.io real-time logic
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // Join workspace room
  socket.on("join:workspace", (workspaceId) => {
    socket.join(workspaceId);
    console.log(`👥 Socket ${socket.id} joined workspace ${workspaceId}`);
  });

  // Leave workspace room
  socket.on("leave:workspace", (workspaceId) => {
    socket.leave(workspaceId);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Task Service connected to MongoDB");
    server.listen(process.env.TASK_SERVICE_PORT, () => {
      console.log(`🚀 Task Service running on port ${process.env.TASK_SERVICE_PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB error:", err));
