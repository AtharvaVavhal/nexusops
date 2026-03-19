import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import { BarChart2, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp, ArrowLeft, RefreshCw } from "lucide-react";

const WORKSPACE_ID = localStorage.getItem("workspaceId") || "69bb975accdf1384f3017e3f";

// ── Inline SVG Charts ─────────────────────────────────────────────────────────
function BurndownChart({ tasks }) {
  const W = 520, H = 200, PAD = { t: 16, r: 16, b: 32, l: 44 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const total = tasks.length;
  if (!total) return <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 12 }}>No task data yet</div>;

  const sorted = [...tasks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const days = 14;
  const start = sorted[0] ? new Date(sorted[0].createdAt) : new Date();
  const ideal = Array.from({ length: days + 1 }, (_, i) => ({ day: i, val: Math.round(total - (total / days) * i) }));

  const doneTasks = tasks.filter(t => t.status === "done" && t.completedAt);
  const doneByDay = {};
  doneTasks.forEach(t => {
    const d = Math.floor((new Date(t.completedAt) - start) / 86400000);
    doneByDay[Math.min(d, days)] = (doneByDay[Math.min(d, days)] || 0) + 1;
  });

  let remaining = total;
  const actual = [];
  for (let i = 0; i <= Math.min(days, 13); i++) {
    remaining -= (doneByDay[i] || 0);
    actual.push({ day: i, val: Math.max(0, remaining) });
    if (remaining <= 0) break;
  }

  const xS = d => PAD.l + (d / days) * iW;
  const yS = v => PAD.t + iH - (Math.max(0, v) / total) * iH;

  const idealPath = ideal.map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.day)},${yS(p.val)}`).join(" ");
  const actualPath = actual.map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.day)},${yS(p.val)}`).join(" ");
  const areaPath = actual.length > 1 ? `${actualPath} L${xS(actual[actual.length - 1].day)},${yS(0)} L${xS(0)},${yS(0)} Z` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow2"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {[0, Math.round(total * 0.25), Math.round(total * 0.5), Math.round(total * 0.75), total].map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={yS(v)} x2={W - PAD.r} y2={yS(v)} stroke="rgba(99,102,241,0.1)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PAD.l - 6} y={yS(v) + 4} textAnchor="end" fontSize="9" fill="#475569">{v}</text>
        </g>
      ))}
      {[0, 3, 7, 10, 14].map(d => (
        <text key={d} x={xS(d)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569">D{d}</text>
      ))}
      {areaPath && <path d={areaPath} fill="url(#aGrad)" />}
      <path d={idealPath} fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" />
      {actualPath && <path d={actualPath} fill="none" stroke="#6366f1" strokeWidth="2.5" filter="url(#glow2)" strokeLinejoin="round" />}
      {actual.map((p, i) => <circle key={i} cx={xS(p.day)} cy={yS(p.val)} r="3" fill="#6366f1" stroke="#0d1626" strokeWidth="1.5" />)}
      <line x1={W - 120} y1={14} x2={W - 100} y2={14} stroke="#334155" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={W - 96} y={18} fontSize="8" fill="#475569">Ideal</text>
      <line x1={W - 120} y1={28} x2={W - 100} y2={28} stroke="#6366f1" strokeWidth="2" />
      <text x={W - 96} y={32} fontSize="8" fill="#818cf8">Actual</text>
    </svg>
  );
}

function StatusBar({ statusCounts, total }) {
  const statuses = [
    { key: "todo",       label: "To Do",       color: "#64748b" },
    { key: "inprogress", label: "In Progress",  color: "#f59e0b" },
    { key: "review",     label: "Review",       color: "#818cf8" },
    { key: "done",       label: "Done",         color: "#10b981" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {statuses.map(s => {
        const count = statusCounts[s.key] || 0;
        const pct   = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 80, fontSize: 11, color: "#64748b" }}>{s.label}</div>
            <div style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ width: 40, fontSize: 11, color: s.color, fontWeight: 600, textAlign: "right" }}>{count}</div>
            <div style={{ width: 30, fontSize: 10, color: "#334155", textAlign: "right" }}>{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]       = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const workspaceId = localStorage.getItem("workspaceId") || WORKSPACE_ID;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      // 1. fetch tasks
      const taskRes = await API.get(`http://localhost:5002/tasks/workspace/${workspaceId}`);
      const taskList = Array.isArray(taskRes.data) ? taskRes.data : [];
      setTasks(taskList);

      // 2. fetch analytics (POST with tasks payload — matches real route)
      const analyticsRes = await API.post(
        `http://localhost:5004/analytics/workspace/${workspaceId}`,
        { tasks: taskList }
      );
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived values ───────────────────────────────────────────────────────
  const bd        = analytics?.burndown || {};
  const anomalies = analytics?.anomalies || [];
  const statusCounts   = analytics?.statusCounts || {};
  const priorityCounts = analytics?.priorityCounts || {};
  const memberStats    = analytics?.memberStats || {};
  const total          = analytics?.totalTasks || tasks.length;
  const completionRate = analytics?.completionRate || 0;
  const topMembers     = Object.values(memberStats).sort((a, b) => b.score - a.score).slice(0, 5);

  const kpis = [
    { label: "Total Tasks",   value: total,                           color: "#6366f1", icon: <BarChart2 size={16} /> },
    { label: "Completed",     value: statusCounts.done || 0,          color: "#10b981", icon: <CheckCircle size={16} /> },
    { label: "Completion",    value: `${completionRate}%`,            color: "#10b981", icon: <TrendingUp size={16} /> },
    { label: "In Progress",   value: statusCounts.inprogress || 0,    color: "#f59e0b", icon: <Clock size={16} /> },
    { label: "Velocity/Day",  value: bd.velocityPerDay ?? "—",        color: "#818cf8", icon: <Zap size={16} /> },
    { label: "Est. Days Left",value: bd.predictedCompletionDays ?? "—", color: bd.onTrack ? "#10b981" : "#ef4444", icon: <TrendingUp size={16} /> },
    { label: "Anomalies",     value: anomalies.length,                color: anomalies.length ? "#ef4444" : "#10b981", icon: <AlertTriangle size={16} /> },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading analytics…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><BarChart2 size={20} className="text-indigo-400" /> Analytics</h1>
          <p className="text-gray-500 text-xs mt-0.5">ML-POWERED · NAIVE BAYES ENGINE</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 text-xs transition">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="p-6 flex flex-col gap-6">

        {/* KPI cards */}
        <div className="grid grid-cols-7 gap-3">
          {kpis.map((k, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
              <div className="flex items-center gap-2 mb-3" style={{ color: k.color }}>{k.icon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-6">

          {/* Burndown chart */}
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">Burndown Chart</h2>
              {bd.message && <span className="text-xs px-2 py-1 rounded-full" style={{ background: bd.onTrack ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: bd.onTrack ? "#10b981" : "#f59e0b" }}>{bd.onTrack ? "✓ On Track" : "⚠ Behind"}</span>}
            </div>
            <BurndownChart tasks={tasks} />
            {bd.message && <p className="text-xs text-gray-500 mt-3">{bd.message}</p>}
          </div>

          {/* Anomalies */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-red-400" /> ML Anomalies</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: anomalies.length ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.1)", color: anomalies.length ? "#ef4444" : "#10b981" }}>{anomalies.length} found</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 260 }}>
              {anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                  <CheckCircle size={28} className="mb-2 text-green-700" />
                  <p className="text-sm">All clear — no anomalies</p>
                </div>
              ) : anomalies.map((a, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: "#0a1220", borderLeft: `3px solid ${a.severity === "critical" ? "#ef4444" : "#f59e0b"}` }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: a.severity === "critical" ? "#ef4444" : "#f59e0b" }}>{a.type?.toUpperCase()}</div>
                  <div className="text-sm text-gray-300 font-medium mb-1">{a.title}</div>
                  <div className="text-xs text-gray-500">{a.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-6">

          {/* Status breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4">Status Breakdown</h2>
            <StatusBar statusCounts={statusCounts} total={total} />
          </div>

          {/* Priority distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4 flex items-center gap-2"><Zap size={14} className="text-purple-400" /> Priority (Naive Bayes)</h2>
            <div className="flex flex-col gap-3">
              {[
                { key: "critical", label: "Critical", color: "#ef4444" },
                { key: "high",     label: "High",     color: "#f59e0b" },
                { key: "medium",   label: "Medium",   color: "#6366f1" },
                { key: "low",      label: "Low",      color: "#64748b" },
              ].map(p => {
                const count = priorityCounts[p.key] || 0;
                const pct   = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 56, fontSize: 11, color: "#64748b" }}>{p.label}</div>
                    <div style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: p.color, borderRadius: 4, transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ width: 24, fontSize: 11, color: p.color, fontWeight: 600 }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member leaderboard */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white text-sm mb-4">Team Productivity</h2>
            {topMembers.length === 0 ? (
              <div className="text-gray-600 text-xs text-center py-6">Assign tasks to see team stats</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: ["#6366f1","#10b981","#f59e0b","#ef4444","#818cf8"][i] + "33", color: ["#6366f1","#10b981","#f59e0b","#ef4444","#818cf8"][i], border: `1px solid ${["#6366f1","#10b981","#f59e0b","#ef4444","#818cf8"][i]}44` }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-300 truncate">{m.name}</div>
                      <div className="text-xs text-gray-600">{m.done}/{m.total} tasks</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: m.score >= 80 ? "#10b981" : m.score >= 50 ? "#f59e0b" : "#ef4444" }}>{m.score}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}