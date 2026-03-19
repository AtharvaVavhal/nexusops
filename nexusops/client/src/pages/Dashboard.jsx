import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import toast from "react-hot-toast";
import { LayoutDashboard, Kanban, GitBranch, FileText, Zap, BarChart2, LogOut, Plus, X } from "lucide-react";

const NAV_ITEMS = [
  { icon: <Kanban size={18}/>,      label: "Kanban Board",      path: "/board",     color: "#6366f1", desc: "Drag & drop tasks" },
  { icon: <GitBranch size={18}/>,   label: "Dependency Graph",  path: "/graph",     color: "#10b981", desc: "D3 force graph" },
  { icon: <FileText size={18}/>,    label: "Documents",         path: "/docs",      color: "#f59e0b", desc: "OT collab editor" },
  { icon: <Zap size={18}/>,         label: "Rule Builder",      path: "/rules",     color: "#a78bfa", desc: "No-code automation" },
  { icon: <BarChart2 size={18}/>,   label: "Analytics",         path: "/analytics", color: "#ef4444", desc: "ML insights" },
];

const WS_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#a78bfa","#06b6d4"];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces]     = useState([]);
  const [showCreate, setShowCreate]     = useState(false);
  const [wsName, setWsName]             = useState("");
  const [creating, setCreating]         = useState(false);
  const [hoveredWs, setHoveredWs]       = useState(null);

  useEffect(() => { fetchWorkspaces(); }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await API.get("https://amiable-optimism-production-b40a.up.railway.app/tasks/workspace");
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const createWorkspace = async () => {
    if (!wsName.trim()) return;
    setCreating(true);
    try {
      const { data } = await API.post("https://amiable-optimism-production-b40a.up.railway.app/tasks/workspace", { name: wsName });
      setWorkspaces(prev => [...prev, data]);
      setShowCreate(false);
      setWsName("");
      toast.success("Workspace created!");
    } catch { toast.error("Failed to create workspace"); }
    setCreating(false);
  };

  const enterWorkspace = (ws) => {
    localStorage.setItem("workspaceId", ws._id);
    navigate("/board");
  };

  const initials = (name) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        .nav-btn { transition: all 0.15s; }
        .nav-btn:hover { background: rgba(99,102,241,0.1); }
        .ws-card { transition: all 0.2s; }
        .ws-card:hover { transform: translateY(-2px); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        input:focus { outline: none; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: "#080e1a", borderRight: "1px solid rgba(99,102,241,0.12)" }}>

        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: "rgba(99,102,241,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", fontFamily: "'Syne',sans-serif" }}>N</div>
            <div>
              <div className="font-bold text-white text-sm" style={{ fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em" }}>NexusOps</div>
              <div className="text-xs" style={{ color: "#475569" }}>TEAM OS</div>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.08)" }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: "rgba(99,102,241,0.06)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa)", color: "#fff" }}>
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.name || "User"}</div>
              <div className="text-xs truncate" style={{ color: "#6366f1" }}>{user?.role || "member"}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <div className="text-xs px-2 mb-2" style={{ color: "#334155", letterSpacing: "0.1em" }}>NAVIGATE</div>
          {NAV_ITEMS.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left border border-transparent"
              style={{ color: "#64748b" }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#94a3b8" }}>{item.label}</div>
                <div className="text-xs" style={{ color: "#334155" }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(99,102,241,0.08)" }}>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-left hover:bg-red-950/30"
            style={{ color: "#ef4444", fontSize: 12 }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "rgba(99,102,241,0.1)" }}>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em" }}>
              Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} · Select one to get started
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff" }}>
            <Plus size={16} /> New Workspace
          </button>
        </div>

        {/* Feature pills */}
        <div className="px-8 py-3 flex items-center gap-2 border-b flex-shrink-0" style={{ borderColor: "rgba(99,102,241,0.06)", background: "rgba(99,102,241,0.02)" }}>
          {[["⚡ ML Priority", "#6366f1"], ["🔗 OT Collab", "#10b981"], ["📊 Naive Bayes", "#f59e0b"], ["🔀 Rule Engine", "#a78bfa"], ["📈 Burndown", "#ef4444"]].map(([label, color]) => (
            <span key={label} className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
              {label}
            </span>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Quick actions */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {NAV_ITEMS.map((item, i) => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="ws-card p-4 rounded-xl border text-left cursor-pointer"
                style={{ background: "#0d1626", borderColor: "rgba(99,102,241,0.12)", animationDelay: `${i * 50}ms` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${item.color}20` }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <div className="text-xs font-semibold text-white mb-0.5">{item.label}</div>
                <div className="text-xs" style={{ color: "#475569" }}>{item.desc}</div>
              </button>
            ))}
          </div>

          {/* Workspaces */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#94a3b8", letterSpacing: "0.08em" }}>WORKSPACES</h2>
            <span className="text-xs" style={{ color: "#334155" }}>{workspaces.length} total</span>
          </div>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed"
              style={{ borderColor: "rgba(99,102,241,0.12)", color: "#334155" }}>
              <div className="text-4xl mb-4">🚀</div>
              <p className="text-sm font-semibold mb-1" style={{ color: "#475569" }}>No workspaces yet</p>
              <p className="text-xs mb-4">Create one to start managing your team</p>
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                + Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws, i) => {
                const color = WS_COLORS[i % WS_COLORS.length];
                return (
                  <div key={ws._id} onClick={() => enterWorkspace(ws)}
                    onMouseEnter={() => setHoveredWs(ws._id)}
                    onMouseLeave={() => setHoveredWs(null)}
                    className="ws-card fade-in rounded-xl border cursor-pointer p-5"
                    style={{ background: "#0d1626", borderColor: hoveredWs === ws._id ? color : "rgba(99,102,241,0.12)", boxShadow: hoveredWs === ws._id ? `0 0 20px ${color}20` : "none" }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}30`, fontFamily: "'Syne',sans-serif" }}>
                        {ws.name?.[0]?.toUpperCase() || "W"}
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                        Active
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-1 truncate" style={{ fontFamily: "'Syne',sans-serif", fontSize: 15 }}>{ws.name}</h3>
                    <p className="text-xs mb-3" style={{ color: "#475569" }}>
                      {ws.members?.length || 0} member{ws.members?.length !== 1 ? "s" : ""} · {new Date(ws.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {["Kanban","Graph","Docs"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.08)", color: "#475569" }}>{t}</span>
                        ))}
                      </div>
                      <span className="text-xs" style={{ color }}>→ Enter</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Create Workspace Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6 fade-in" style={{ background: "#0d1626", border: "1px solid rgba(99,102,241,0.25)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white" style={{ fontFamily: "'Syne',sans-serif", fontSize: 18 }}>New Workspace</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-white transition"><X size={18} /></button>
            </div>
            <input autoFocus value={wsName} onChange={e => setWsName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createWorkspace()}
              placeholder="e.g. NexusOps Hackathon"
              className="w-full px-4 py-3 rounded-xl text-white text-sm mb-4"
              style={{ background: "#060b14", border: "1px solid rgba(99,102,241,0.25)", fontFamily: "'JetBrains Mono',monospace" }} />
            <div className="flex gap-3">
              <button onClick={createWorkspace} disabled={creating || !wsName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff" }}>
                {creating ? "Creating…" : "Create Workspace"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl text-sm transition"
                style={{ background: "rgba(99,102,241,0.1)", color: "#64748b" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}