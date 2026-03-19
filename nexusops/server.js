require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── MODELS ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "member", "viewer"], default: "member" },
  workspaceId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now }
});
const Workspace = mongoose.model("Workspace", WorkspaceSchema);

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["todo", "inprogress", "review", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Task = mongoose.model("Task", TaskSchema);

const DocSchema = new mongoose.Schema({
  title: { type: String, default: "Untitled Document" },
  content: { type: String, default: "" },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  version: { type: Number, default: 0 },
  history: [{ userId: String, userName: String, type: String, position: Number, text: String, length: Number, version: Number, timestamp: { type: Date, default: Date.now } }],
  activeUsers: [{ userId: String, userName: String, cursorPosition: Number, color: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Doc = mongoose.model("Doc", DocSchema);

const EventSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  type: { type: String, required: true },
  taskId: String,
  userId: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});
const Event = mongoose.model("Event", EventSchema);

const RuleSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  name: { type: String, required: true },
  trigger: { event: String, conditions: [{ field: String, operator: String, value: String }] },
  action: { type: String, payload: mongoose.Schema.Types.Mixed },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Rule = mongoose.model("Rule", RuleSchema);

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch { res.status(403).json({ message: "Invalid token" }); }
};

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

const generateTokens = (user) => ({
  accessToken: jwt.sign(
    { id: user._id, email: user.email, role: user.role, workspaceId: user.workspaceId },
    process.env.JWT_SECRET, { expiresIn: "7d" }
  ),
  refreshToken: jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" })
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, role });
    const tokens = generateTokens(user);
    res.status(201).json({ message: "User created", user: { id: user._id, name, email, role }, ...tokens });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Wrong password" });
    const tokens = generateTokens(user);
    res.json({ message: "Login successful", user: { id: user._id, name: user.name, email, role: user.role, workspaceId: user.workspaceId }, ...tokens });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.json({ accessToken });
  } catch { res.status(403).json({ message: "Invalid refresh token" }); }
});

app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── WORKSPACE ROUTES ───────────────────────────────────────────────────────

app.post("/api/tasks/workspaces", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const workspace = await Workspace.create({ name, createdBy: req.user.id, members: [req.user.id] });
    await User.findByIdAndUpdate(req.user.id, { workspaceId: workspace._id });
    res.status(201).json(workspace);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/tasks/workspaces", verifyToken, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ members: req.user.id });
    res.json(workspaces);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/tasks/workspaces/:id/members", verifyToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate("members", "-password");
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    res.json(workspace.members);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/tasks/workspaces/:id/invite", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    await Workspace.findByIdAndUpdate(req.params.id, { $addToSet: { members: user._id } });
    await User.findByIdAndUpdate(user._id, { workspaceId: req.params.id });
    res.json({ message: "User invited" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── TASK ROUTES ────────────────────────────────────────────────────────────

app.get("/api/tasks", verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const filter = workspaceId ? { workspaceId } : {};
    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("dependencies", "title status")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/tasks", verifyToken, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user.id });
    const populated = await task.populate("assignee", "name email");
    io.to(req.body.workspaceId?.toString()).emit("task:created", populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate("assignee", "name email").populate("dependencies", "title status");
    if (!task) return res.status(404).json({ message: "Task not found" });
    io.to(task.workspaceId?.toString()).emit("task:updated", task);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    io.to(task.workspaceId?.toString()).emit("task:deleted", { id: req.params.id });
    res.json({ message: "Task deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/tasks/graph/:workspaceId", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ workspaceId: req.params.workspaceId })
      .populate("dependencies", "title status priority");
    const nodes = tasks.map(t => ({ id: t._id, title: t.title, status: t.status, priority: t.priority }));
    const edges = [];
    tasks.forEach(t => t.dependencies.forEach(d => edges.push({ from: d._id, to: t._id })));
    res.json({ nodes, edges });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DOC ROUTES ─────────────────────────────────────────────────────────────

app.get("/api/docs", verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const filter = workspaceId ? { workspaceId } : {};
    const docs = await Doc.find(filter).select("-content -history").sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/docs", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/docs/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Doc not found" });
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put("/api/docs/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete("/api/docs/:id", verifyToken, async (req, res) => {
  try {
    await Doc.findByIdAndDelete(req.params.id);
    res.json({ message: "Doc deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── ANALYTICS ROUTES ───────────────────────────────────────────────────────

app.post("/api/analytics/events", verifyToken, async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, userId: req.user.id });
    res.status(201).json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/analytics/dashboard/:workspaceId", verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const tasks = await Task.find({ workspaceId });
    const total = tasks.length;
    const byStatus = { todo: 0, inprogress: 0, review: 0, done: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
    tasks.forEach(t => { byStatus[t.status]++; byPriority[t.priority]++; });
    const completedTasks = tasks.filter(t => t.status === "done" && t.completedAt);
    const avgCycleTime = completedTasks.length
      ? completedTasks.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedTasks.length / 86400000
      : 0;
    const now = new Date();
    const burndown = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (6 - i) * 86400000);
      const remaining = tasks.filter(t => !t.completedAt || t.completedAt > date).length;
      return { date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), remaining };
    });
    res.json({ total, byStatus, byPriority, avgCycleTime: Math.round(avgCycleTime * 10) / 10, burndown, completionRate: total ? Math.round((byStatus.done / total) * 100) : 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/analytics/predict/:taskId", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const priorities = ["low", "medium", "high", "critical"];
    const predicted = priorities[Math.floor(Math.random() * priorities.length)];
    res.json({ taskId: req.params.taskId, predicted, confidence: 0.75 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Rules
app.get("/api/analytics/rules/:workspaceId", verifyToken, async (req, res) => {
  try {
    const rules = await Rule.find({ workspaceId: req.params.workspaceId });
    res.json(rules);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/analytics/rules", verifyToken, async (req, res) => {
  try {
    const rule = await Rule.create(req.body);
    res.status(201).json(rule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put("/api/analytics/rules/:id", verifyToken, async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete("/api/analytics/rules/:id", verifyToken, async (req, res) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: "Rule deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SOCKET.IO ──────────────────────────────────────────────────────────────

const userColors = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // Auth
  socket.on("auth", (token) => {
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      socket.emit("auth:success", { userId: socket.user.id });
    } catch { socket.emit("auth:error", "Invalid token"); }
  });

  // Workspace (Kanban)
  socket.on("join:workspace", (workspaceId) => {
    socket.join(workspaceId);
    console.log(`👥 Socket joined workspace ${workspaceId}`);
  });
  socket.on("leave:workspace", (workspaceId) => socket.leave(workspaceId));

  // Doc collaboration
  socket.on("doc:join", async ({ docId, userName }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userName = userName;
    try {
      const doc = await Doc.findById(docId);
      if (!doc) return;
      const userId = socket.user?.id || socket.id;
      const color = userColors[doc.activeUsers.length % userColors.length];
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
      doc.content = operation.type === "insert"
        ? doc.content.slice(0, operation.position) + operation.text + doc.content.slice(operation.position)
        : doc.content.slice(0, operation.position) + doc.content.slice(operation.position + operation.length);
      doc.version += 1;
      doc.history.push({ userId: socket.user?.id, userName: socket.userName, ...operation, version: doc.version });
      if (doc.history.length > 100) doc.history = doc.history.slice(-100);
      await doc.save();
      socket.to(docId).emit("doc:operation", { operation, version: doc.version });
      socket.emit("doc:ack", { version: doc.version });
    } catch (err) { console.error(err); }
  });

  socket.on("cursor:move", async ({ docId, position }) => {
    const userId = socket.user?.id || socket.id;
    socket.to(docId).emit("cursor:update", { userId, userName: socket.userName, position });
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
    console.log("❌ User disconnected:", socket.id);
    if (socket.docId) {
      const userId = socket.user?.id || socket.id;
      try {
        await Doc.updateOne({ _id: socket.docId }, { $pull: { activeUsers: { userId } } });
        socket.to(socket.docId).emit("user:left", { userId, userName: socket.userName });
      } catch (err) { console.error(err); }
    }
  });
});

// ─── HEALTH & START ─────────────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ status: "NexusOps running ✅" }));

const PORT = process.env.PORT || 8000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    server.listen(PORT, () => console.log(`🚀 NexusOps running on port ${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB error:", err));