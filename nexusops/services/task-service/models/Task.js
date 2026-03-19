const mongoose = require("mongoose");

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

module.exports = mongoose.model("Task", TaskSchema);
