require("dotenv").config({ path: "../../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Doc = require("./models/Doc");
const ot = require("./utils/ot");
const docRoutes = require("./routes/docs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] } });

app.use(cors());
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });
app.use("/docs", docRoutes);
app.get("/health", (req, res) => res.json({ status: "Doc service running" }));

const userColors = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];
const getColor = (index) => userColors[index % userColors.length];

io.on("connection", (socket) => {
  console.log("⚡ Doc user connected:", socket.id);

  socket.on("auth", (token) => {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      socket.emit("auth:success", { userId: user.id, name: user.email });
    } catch { socket.emit("auth:error", "Invalid token"); }
  });

  socket.on("doc:join", async ({ docId, userName }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userName = userName;
    try {
      const doc = await Doc.findById(docId);
      if (!doc) return;
      const color = getColor(doc.activeUsers.length);
      const userId = socket.user?.id || socket.id;
      doc.activeUsers = doc.activeUsers.filter(u => u.userId !== userId);
      doc.activeUsers.push({ userId, userName, cursorPosition: 0, color });
      await doc.save();
      socket.emit("doc:init", { content: doc.content, version: doc.version, activeUsers: doc.activeUsers });
      socket.to(docId).emit("user:joined", { userId, userName, color });
    } catch (err) { console.error(err); }
  });

  socket.on("doc:operation", async ({ docId, operation, version }) => {
    try {
      const doc = await Doc.findById(docId);
      if (!doc) return;
      let transformedOp = operation;
      const concurrentOps = doc.history.filter(h => h.version >= version);
      concurrentOps.forEach(concurrentOp => { transformedOp = ot.transform(transformedOp, concurrentOp); });
      doc.content = ot.apply(doc.content, transformedOp);
      doc.version += 1;
      doc.updatedAt = new Date();
      doc.history.push({ userId: socket.user?.id, userName: socket.userName, ...transformedOp, version: doc.version });
      if (doc.history.length > 100) doc.history = doc.history.slice(-100);
      await doc.save();
      socket.to(docId).emit("doc:operation", { operation: transformedOp, version: doc.version });
      socket.emit("doc:ack", { version: doc.version });
    } catch (err) { console.error(err); }
  });

  socket.on("cursor:move", async ({ docId, position }) => {
    const userId = socket.user?.id || socket.id;
    socket.to(docId).emit("cursor:update", { userId, userName: socket.userName, position });
    try {
      await Doc.updateOne({ _id: docId, "activeUsers.userId": userId }, { $set: { "activeUsers.$.cursorPosition": position } });
    } catch (err) { console.error(err); }
  });

  socket.on("doc:leave", async ({ docId }) => {
    socket.leave(docId);
    const userId = socket.user?.id || socket.id;
    try {
      await Doc.updateOne({ _id: docId }, { $pull: { activeUsers: { userId } } });
      socket.to(docId).emit("user:left", { userId, userName: socket.userName });
    } catch (err) { console.error(err); }
  });

  socket.on("disconnect", async () => {
    console.log("❌ Doc user disconnected:", socket.id);
    if (socket.docId) {
      const userId = socket.user?.id || socket.id;
      try {
        await Doc.updateOne({ _id: socket.docId }, { $pull: { activeUsers: { userId } } });
        socket.to(socket.docId).emit("user:left", { userId, userName: socket.userName });
      } catch (err) { console.error(err); }
    }
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Doc Service connected to MongoDB");
    server.listen(process.env.DOC_SERVICE_PORT, () => {
      console.log(`🚀 Doc Service running on port ${process.env.DOC_SERVICE_PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB error:", err));
