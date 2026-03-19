import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { taskSocket } from "../utils/socket";
import toast from "react-hot-toast";

const COLUMNS = [
  { id: "todo",       label: "To Do",       emoji: "📋", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
  { id: "inprogress", label: "In Progress", emoji: "⚡", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  { id: "review",     label: "Review",      emoji: "👀", color: "#818cf8", bg: "rgba(129,140,248,0.08)" },
  { id: "done",       label: "Done",        emoji: "✅", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
];

const PRIORITY_META = {
  low:      { color: "#64748b", bg: "rgba(100,116,139,0.15)", label: "Low" },
  medium:   { color: "#6366f1", bg: "rgba(99,102,241,0.15)",  label: "Med" },
  high:     { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  label: "High" },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   label: "Crit" },
};

const BASE      = "http://localhost:5002";
const ANALYTICS = "http://localhost:5004";

export default function Board() {
  const navigate = useNavigate();
  const workspaceId = localStorage.getItem("workspaceId");
  const [tasks, setTasks]         = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dragging, setDragging]   = useState(null);
  const [dragOver, setDragOver]   = useState(null);
  const [form, setForm]           = useState({ title: "", description: "", priority: "medium", dueDate: "" });
  const [predicting, setPredicting] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [focused, setFocused]     = useState("");

  const token   = localStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!workspaceId) { navigate("/"); return; }
    fetchTasks();
    taskSocket.emit("join:workspace", workspaceId);
    taskSocket.on("task:created", task => setTasks(prev => [...prev, task]));
    taskSocket.on("task:updated", task => setTasks(prev => prev.map(t => t._id === task._id ? task : t)));
    taskSocket.on("task:deleted", ({ id }) => setTasks(prev => prev.filter(t => t._id !== id)));
    return () => {
      taskSocket.off("task:created");
      taskSocket.off("task:updated");
      taskSocket.off("task:deleted");
    };
  }, [workspaceId]);

  const fetchTasks = async () => {
    try {
      const res  = await fetch(`${BASE}/tasks/workspace/${workspaceId}`, { headers });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to load tasks"); }
  };

  const predictPriority = async (title) => {
    if (!title || title.length < 3) return;
    setPredicting(true);
    try {
      const res  = await fetch(`${ANALYTICS}/analytics/predict-priority`, { method: "POST", headers, body: JSON.stringify({ title }) });
      const data = await res.json();
      setForm(f => ({ ...f, priority: data.priority }));
      toast.success(`🤖 ML predicted: ${data.priority}`);
    } catch {}
    setPredicting(false);
  };

  const createTask = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/tasks`, { method: "POST", headers, body: JSON.stringify({ ...form, workspaceId }) });
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "" });
      toast.success("Task created!");
    } catch { toast.error("Failed to create task"); }
    setCreating(false);
  };

  const moveTask = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      const res = await fetch(`${BASE}/tasks/${taskId}`, { method: "PUT", headers, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error();
    } catch { toast.error("Failed to move task"); fetchTasks(); }
  };

  const deleteTask = async (taskId) => {
    try {
      await fetch(`${BASE}/tasks/${taskId}`, { method: "DELETE", headers });
      toast.success("Task deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleDragStart = (e, task) => { setDragging(task); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd   = ()        => { setDragging(null); setDragOver(null); };
  const handleDrop      = (e, colId) => {
    e.preventDefault();
    if (dragging && dragging.status !== colId) moveTask(dragging._id, colId);
    setDragging(null); setDragOver(null);
  };

  const colTasks = (colId) => tasks.filter(t => t.status === colId);
  const doneCount = tasks.filter(t => t.status === "done").length;
  const progress  = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const inputS = (field) => ({
    width: "100%", background: "#060b14", color: "#f1f5f9", fontSize: 13,
    border: `1px solid ${focused === field ? "#6366f1" : "rgba(99,102,241,0.2)"}`,
    borderRadius: 8, padding: "10px 14px", outline: "none", fontFamily: "'JetBrains Mono',monospace",
    transition: "border-color 0.15s", boxSizing: "border-box",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        ::placeholder{color:#334155} select option{background:#0d1626}
        .task-card{transition:all 0.15s; cursor:grab;}
        .task-card:hover{transform:translateY(-1px);}
        .task-card:active{cursor:grabbing;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .slide-down{animation:slideDown 0.2s ease}
      `}</style>

      {/* Header */}
      <header style={{ padding: "16px 24px", borderBottom: "1px solid rgba(99,102,241,0.12)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, background: "#080e1a" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
            NexusOps <span style={{ color: "#6366f1" }}>/ Kanban</span>
          </h1>
          <p style={{ margin: 0, fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>
            REAL-TIME · SOCKET.IO · {tasks.length} TASKS
          </p>
        </div>
        <div style={{ flex: 1 }} />

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "6px 14px" }}>
          <div style={{ width: 80, height: 4, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{progress}% DONE</span>
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#10b981" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          LIVE
        </div>

        <button onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
          + New Task
        </button>
      </header>

      {/* Create Task Panel */}
      {showCreate && (
        <div className="slide-down" style={{ margin: "16px 24px", background: "#0d1626", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Create New Task</span>
            {predicting && (
              <span style={{ fontSize: 11, color: "#6366f1", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, border: "2px solid rgba(99,102,241,0.3)", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                🤖 ML predicting…
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input style={{ ...inputS("title"), gridColumn: "1 / -1" }} placeholder="Task title (ML will predict priority on blur)"
              value={form.title} onFocus={() => setFocused("title")} onBlur={e => { setFocused(""); predictPriority(e.target.value); }}
              onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            <input style={{ ...inputS("desc"), gridColumn: "1 / -1" }} placeholder="Description (optional)"
              value={form.description} onFocus={() => setFocused("desc")} onBlur={() => setFocused("")}
              onChange={e => setForm({ ...form, description: e.target.value })} />
            <div>
              <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>PRIORITY</label>
              <select style={{ ...inputS("priority"), cursor: "pointer" }} value={form.priority}
                onFocus={() => setFocused("priority")} onBlur={() => setFocused("")}
                onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>DUE DATE</label>
              <input type="date" style={{ ...inputS("date"), colorScheme: "dark" }} value={form.dueDate}
                onFocus={() => setFocused("date")} onBlur={() => setFocused("")}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          {/* Priority preview */}
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <button key={key} onClick={() => setForm({ ...form, priority: key })}
                style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${form.priority === key ? meta.color : "transparent"}`, background: form.priority === key ? meta.bg : "transparent", color: form.priority === key ? meta.color : "#334155", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", transition: "all 0.15s" }}>
                {meta.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={createTask} disabled={creating || !form.title.trim()}
              style={{ padding: "9px 24px", background: creating ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: creating ? "wait" : "pointer", fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: 8, opacity: !form.title.trim() ? 0.5 : 1 }}>
              {creating ? <><div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Creating…</> : "→ Create Task"}
            </button>
            <button onClick={() => { setShowCreate(false); setForm({ title: "", description: "", priority: "medium", dueDate: "" }); }}
              style={{ padding: "9px 18px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "16px 24px 24px", overflow: "hidden" }}>
        {COLUMNS.map(col => {
          const colTaskList = colTasks(col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              style={{ display: "flex", flexDirection: "column", background: isOver ? col.bg : "#0a1220", border: `1px solid ${isOver ? col.color : "rgba(99,102,241,0.1)"}`, borderRadius: 14, overflow: "hidden", transition: "all 0.15s", borderTop: `3px solid ${col.color}` }}>

              {/* Column header */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{col.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label.toUpperCase()}</span>
                </div>
                <div style={{ minWidth: 22, height: 22, borderRadius: 11, background: `${col.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: col.color }}>
                  {colTaskList.length}
                </div>
              </div>

              {/* Tasks */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                {colTaskList.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#1e293b", fontSize: 11, textAlign: "center", padding: 20, border: "2px dashed rgba(99,102,241,0.06)", borderRadius: 10, minHeight: 80 }}>
                    Drop tasks here
                  </div>
                )}
                {colTaskList.map(task => {
                  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                  return (
                    <div key={task._id} className="task-card"
                      draggable onDragStart={e => handleDragStart(e, task)} onDragEnd={handleDragEnd}
                      style={{ background: "#0d1626", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 10, padding: "12px 14px", opacity: dragging?._id === task._id ? 0.5 : 1 }}>

                      {/* Priority + title */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.4, flex: 1, margin: 0 }}>{task.title}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pm.bg, color: pm.color, flexShrink: 0, letterSpacing: "0.05em" }}>{pm.label.toUpperCase()}</span>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p style={{ fontSize: 11, color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>{task.description}</p>
                      )}

                      {/* Footer */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                        {task.dueDate ? (
                          <span style={{ fontSize: 10, color: isOverdue ? "#ef4444" : "#475569" }}>
                            {isOverdue ? "⚠ " : "📅 "}{new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : <span />}
                        <button onClick={() => deleteTask(task._id)}
                          style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 4, lineHeight: 1 }}
                          title="Delete task">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}