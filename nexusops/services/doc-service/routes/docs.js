const express = require("express");
const Doc = require("../models/Doc");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.get("/workspace/:workspaceId", verifyToken, async (req, res) => {
  try {
    const docs = await Doc.find({ workspaceId: req.params.workspaceId })
      .select("title version createdBy createdAt updatedAt")
      .populate("createdBy", "name email");
    res.json(docs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Doc not found" });
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, workspaceId } = req.body;
    const doc = await Doc.create({ title, workspaceId, createdBy: req.user.id });
    req.io.to(workspaceId).emit("doc:created", doc);
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/:id/history", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.findById(req.params.id).select("history title version");
    if (!doc) return res.status(404).json({ message: "Doc not found" });
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Doc.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Doc not found" });
    req.io.to(doc.workspaceId.toString()).emit("doc:deleted", { id: req.params.id });
    res.json({ message: "Doc deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
