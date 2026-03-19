const express = require("express");
const Task = require("../models/Task");
const Workspace = require("../models/Workspace");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

// Get all tasks for a workspace
router.get("/workspace/:workspaceId", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ workspaceId: req.params.workspaceId })
      .populate("assignee", "name email")
      .populate("dependencies", "title status");
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create task
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, status, priority, assignee, workspaceId, dependencies, dueDate } = req.body;
    const task = await Task.create({
      title, description, status, priority, assignee,
      workspaceId, dependencies, dueDate, createdBy: req.user.id
    });
    // Emit socket event
    req.io.to(workspaceId).emit("task:created", task);
    res.status(201).json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update task (drag & drop status change)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ message: "Task not found" });

    if (req.body.status === "done" && oldTask.status !== "done") {
      req.body.completedAt = new Date();
    }
    req.body.updatedAt = new Date();

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("assignee", "name email");

    // Emit real-time update to all workspace members
    req.io.to(task.workspaceId.toString()).emit("task:updated", task);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete task
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    req.io.to(task.workspaceId.toString()).emit("task:deleted", { id: req.params.id });
    res.json({ message: "Task deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create workspace
router.post("/workspace", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const workspace = await Workspace.create({
      name, createdBy: req.user.id,
      members: [{ userId: req.user.id, role: "admin" }]
    });
    res.status(201).json(workspace);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get workspace
router.get("/workspace", verifyToken, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ "members.userId": req.user.id });
    res.json(workspaces);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

// Get dependency graph data for D3.js
const { getGraphData, detectCycle } = require("../utils/graphEngine");

router.get("/graph/:workspaceId", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ workspaceId: req.params.workspaceId })
      .populate("assignee", "name email")
      .populate("dependencies", "title status priority");
    
    const graphData = getGraphData(tasks);
    res.json(graphData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Check if adding a dependency creates a cycle
router.post("/check-cycle", verifyToken, async (req, res) => {
  try {
    const { taskId, dependencyId, workspaceId } = req.body;
    const tasks = await Task.find({ workspaceId }).populate("dependencies");
    
    // Temporarily add the dependency to check
    const taskIndex = tasks.findIndex(t => t._id.toString() === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].dependencies.push({ _id: dependencyId });
    }
    
    const { hasCycle } = detectCycle(tasks);
    res.json({ hasCycle, safe: !hasCycle });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
