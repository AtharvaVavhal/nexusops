const mongoose = require("mongoose");

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "member" }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Workspace", WorkspaceSchema);
