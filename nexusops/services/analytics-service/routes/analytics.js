const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const Event = require("../models/Event");
const { forecastBurndown, detectAnomalies, priorityClassifier } = require("../utils/mlEngine");
const router = express.Router();

// Log event
router.post("/event", verifyToken, async (req, res) => {
  try {
    const { workspaceId, type, data } = req.body;
    const event = await Event.create({ workspaceId, userId: req.user.id, type, data });
    res.status(201).json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get analytics for workspace
router.post("/workspace/:workspaceId", verifyToken, async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks) return res.status(400).json({ message: "Tasks required" });

    const statusCounts = { todo: 0, inprogress: 0, review: 0, done: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const memberStats = {};

    tasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
      if (task.assignee) {
        const id = task.assignee._id || task.assignee;
        const name = task.assignee.name || "Unknown";
        if (!memberStats[id]) memberStats[id] = { name, total: 0, done: 0, score: 0 };
        memberStats[id].total++;
        if (task.status === "done") memberStats[id].done++;
      }
    });

    // Productivity scores
    Object.values(memberStats).forEach(m => {
      m.score = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
    });

    const burndown = forecastBurndown(tasks);
    const anomalies = detectAnomalies(tasks);

    res.json({
      statusCounts,
      priorityCounts,
      memberStats,
      burndown,
      anomalies,
      totalTasks: tasks.length,
      completionRate: tasks.length > 0 ? Math.round((statusCounts.done / tasks.length) * 100) : 0
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ML: Predict task priority from title
router.post("/predict-priority", verifyToken, (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });
    const priority = priorityClassifier.predict(title);
    res.json({ priority, confidence: "ML-based prediction" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
