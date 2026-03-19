const express = require("express");
const Rule = require("../models/Rule");
const verifyToken = require("../middleware/verifyToken");
const { evaluateRules } = require("../utils/ruleEngine");
const router = express.Router();

// Get all rules for workspace
router.get("/:workspaceId", verifyToken, async (req, res) => {
  try {
    const rules = await Rule.find({ workspaceId: req.params.workspaceId });
    res.json(rules);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create rule
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, workspaceId, logic, conditions, actions } = req.body;
    const rule = await Rule.create({ name, workspaceId, logic, conditions, actions, createdBy: req.user.id });
    res.status(201).json(rule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update rule
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rule);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete rule
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: "Rule deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Test rule against a task
router.post("/evaluate", verifyToken, async (req, res) => {
  try {
    const { task, workspaceId } = req.body;
    const rules = await Rule.find({ workspaceId, active: true });
    const { task: updatedTask, triggeredRules } = await evaluateRules(rules, task, null);
    res.json({ updatedTask, triggeredRules });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
