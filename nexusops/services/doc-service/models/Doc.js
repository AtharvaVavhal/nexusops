const mongoose = require("mongoose");
const OperationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: String,
  type: { type: String, enum: ["insert", "delete"] },
  position: Number,
  text: String,
  length: Number,
  version: Number,
  timestamp: { type: Date, default: Date.now }
});
const DocSchema = new mongoose.Schema({
  title: { type: String, required: true, default: "Untitled Document" },
  content: { type: String, default: "" },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  version: { type: Number, default: 0 },
  history: [OperationSchema],
  activeUsers: [{ userId: String, userName: String, cursorPosition: Number, color: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Doc", DocSchema);
