import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Inline SVGs — no lucide-react dependency
const I = {
  ArrowLeft:     ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  BarChart2:     ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Zap:           ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  AlertTriangle: ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  CheckCircle:   ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Clock:         ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  TrendingUp:    ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  RefreshCw:     ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>,
  Plus:          ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash2:        ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Play:          ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Save:          ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  ToggleLeft:    ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3"/></svg>,
  ToggleRight:   ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="16" cy="12" r="3"/></svg>,
  ChevronDown:   ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronUp:     ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  FileText:      ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Eye:           ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Pencil:        ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  Wifi:          ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  WifiOff:       ({size=16,className=""}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
};


// ─── Constants ────────────────────────────────────────────────────────────────
const WORKSPACE_ID = "69bb975accdf1384f3017e3f";
const TASK_API = "https://amiable-optimism-production-b40a.up.railway.app";

const STATUS_META = {
  todo:        { color: "#64748b", glow: "#64748b", label: "To Do" },
  inprogress:  { color: "#f59e0b", glow: "#f59e0b", label: "In Progress" },
  review:      { color: "#818cf8", glow: "#818cf8", label: "Review" },
  done:        { color: "#10b981", glow: "#10b981", label: "Done" },
  blocked:     { color: "#ef4444", glow: "#ef4444", label: "Blocked" },
};

const PRIORITY_R = { critical: 22, high: 18, medium: 15, low: 12 };

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_TASKS = [
  { _id: "t1", title: "Auth Service",      status: "done",       priority: "critical", dependencies: [] },
  { _id: "t2", title: "API Gateway",       status: "done",       priority: "high",     dependencies: ["t1"] },
  { _id: "t3", title: "Task Service",      status: "done",       priority: "high",     dependencies: ["t1"] },
  { _id: "t4", title: "Doc Service",       status: "inprogress", priority: "high",     dependencies: ["t1"] },
  { _id: "t5", title: "Analytics Service", status: "inprogress", priority: "high",     dependencies: ["t3"] },
  { _id: "t6", title: "Kanban Board UI",   status: "done",       priority: "medium",   dependencies: ["t2", "t3"] },
  { _id: "t7", title: "GraphView UI",      status: "inprogress", priority: "medium",   dependencies: ["t2", "t3"] },
  { _id: "t8", title: "Analytics UI",      status: "todo",       priority: "medium",   dependencies: ["t5"] },
  { _id: "t9", title: "RuleBuilder UI",    status: "todo",       priority: "medium",   dependencies: ["t5"] },
  { _id: "ta", title: "DocEditor UI",      status: "todo",       priority: "medium",   dependencies: ["t4"] },
  { _id: "tb", title: "ML Priority Model", status: "done",       priority: "critical", dependencies: ["t3"] },
  { _id: "tc", title: "OT Algorithm",      status: "done",       priority: "critical", dependencies: [] },
  { _id: "td", title: "Burndown Engine",   status: "inprogress", priority: "high",     dependencies: ["t5"] },
  { _id: "te", title: "Deploy & CI/CD",    status: "todo",       priority: "high",     dependencies: ["t6","t7","t8","t9","ta"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildGraph(tasks) {
  const idMap = {};
  tasks.forEach(t => { idMap[t._id] = t; });

  const nodes = tasks.map(t => ({
    id: t._id,
    title: t.title,
    status: t.status || "todo",
    priority: t.priority || "medium",
  }));

  const links = [];
  tasks.forEach(t => {
    (t.dependencies || []).forEach(dep => {
      if (idMap[dep]) links.push({ source: dep, target: t._id });
    });
  });

  return { nodes, links };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GraphView() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const navigate = useNavigate();

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [filterStatus, setFilter]   = useState("all");
  const [stats, setStats]           = useState({});
  const [usingMock, setUsingMock]   = useState(false);

  // ── Fetch tasks ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const workspaceId = localStorage.getItem("workspaceId") || WORKSPACE_ID;
    const token = localStorage.getItem("accessToken");
    fetch(`${TASK_API}/tasks/workspace/${workspaceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("API error"); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : data.tasks || [];
        setTasks(list.length ? list : MOCK_TASKS);
        if (!list.length) setUsingMock(true);
      })
      .catch(() => { setTasks(MOCK_TASKS); setUsingMock(true); })
      .finally(() => setLoading(false));
  }, []);

  // ── Compute stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = {};
    tasks.forEach(t => { s[t.status || "todo"] = (s[t.status || "todo"] || 0) + 1; });
    setStats(s);
  }, [tasks]);

  // ── D3 render ────────────────────────────────────────────────────────────────
  const renderGraph = useCallback(() => {
    if (!tasks.length || !svgRef.current || !containerRef.current) return;

    const el   = containerRef.current;
    const W    = el.clientWidth  || 900;
    const H    = el.clientHeight || 600;

    // Filter
    const filtered = filterStatus === "all"
      ? tasks
      : tasks.filter(t => t.status === filterStatus);

    const filteredIds = new Set(filtered.map(t => t._id));
    const { nodes: rawNodes, links: rawLinks } = buildGraph(filtered);
    const links = rawLinks.filter(
      l => filteredIds.has(l.source) || filteredIds.has(l.source?.id)
    );

    // Clear
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", W)
      .attr("height", H)
      .style("background", "transparent");

    // Defs — arrowhead + glow filters
    const defs = svg.append("defs");

    // Arrow marker per status colour
    Object.entries(STATUS_META).forEach(([key, meta]) => {
      defs.append("marker")
        .attr("id", `arrow-${key}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 28).attr("refY", 0)
        .attr("markerWidth", 6).attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", meta.color);
    });

    // Glow filter
    const glow = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Grid pattern
    const pat = defs.append("pattern").attr("id", "grid").attr("width", 40).attr("height", 40).attr("patternUnits", "userSpaceOnUse");
    pat.append("path").attr("d", "M 40 0 L 0 0 0 40").attr("fill", "none").attr("stroke", "rgba(99,102,241,0.08)").attr("stroke-width", "1");
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#grid)");

    // Zoom
    const g = svg.append("g");
    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on("zoom", e => g.attr("transform", e.transform))
    );

    // Simulation
    const sim = d3.forceSimulation(rawNodes)
      .force("link",   d3.forceLink(links).id(d => d.id).distance(110).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide(d => PRIORITY_R[d.priority] + 16));
    simRef.current = sim;

    // Links
    const link = g.append("g").attr("class", "links").selectAll("line")
      .data(links).join("line")
      .attr("stroke", d => {
        const tgt = rawNodes.find(n => n.id === (d.target?.id || d.target));
        return STATUS_META[tgt?.status]?.color || "#475569";
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", d => {
        const tgt = rawNodes.find(n => n.id === (d.target?.id || d.target));
        return `url(#arrow-${tgt?.status || "todo"})`;
      });

    // Node groups
    const node = g.append("g").attr("class", "nodes").selectAll("g")
      .data(rawNodes).join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (e, d) => { e.stopPropagation(); setSelected(d); });

    // Outer ring (glow)
    node.append("circle")
      .attr("r", d => PRIORITY_R[d.priority] + 5)
      .attr("fill", "none")
      .attr("stroke", d => STATUS_META[d.status]?.color || "#475569")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.35)
      .attr("filter", "url(#glow)");

    // Main circle
    node.append("circle")
      .attr("r", d => PRIORITY_R[d.priority])
      .attr("fill", d => {
        const c = STATUS_META[d.status]?.color || "#475569";
        return c + "22";
      })
      .attr("stroke", d => STATUS_META[d.status]?.color || "#475569")
      .attr("stroke-width", 2);

    // Priority indicator dot
    node.append("circle")
      .attr("r", 4)
      .attr("cx", d => PRIORITY_R[d.priority] - 4)
      .attr("cy", d => -(PRIORITY_R[d.priority] - 4))
      .attr("fill", d => d.priority === "critical" ? "#ef4444" : d.priority === "high" ? "#f59e0b" : "#64748b")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

    // Labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => PRIORITY_R[d.priority] + 14)
      .attr("font-size", "10px")
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("fill", "#94a3b8")
      .attr("pointer-events", "none")
      .text(d => d.title.length > 16 ? d.title.slice(0, 14) + "…" : d.title);

    // Status icon (simple letter)
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => PRIORITY_R[d.priority] * 0.75)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("font-weight", "bold")
      .attr("fill", d => STATUS_META[d.status]?.color || "#64748b")
      .attr("pointer-events", "none")
      .text(d => d.status === "done" ? "✓" : d.status === "blocked" ? "✗" : d.status === "in-progress" ? "▶" : "○");

    // Tick
    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Click outside deselect
    svg.on("click", () => setSelected(null));
  }, [tasks, filterStatus]);

  useEffect(() => { if (!loading) renderGraph(); }, [loading, renderGraph]);

  // Handle resize
  useEffect(() => {
    const obs = new ResizeObserver(() => { if (!loading) renderGraph(); });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [loading, renderGraph]);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const total    = tasks.length;
  const doneCount = stats["done"] || 0;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column" }}>

      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        .node-card { animation: fadeUp 0.25s ease; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .status-pill { transition: background 0.2s, color 0.2s; }
        .status-pill:hover { filter: brightness(1.2); }
      `}</style>

      {/* ── Header ── */}
      <header style={{ padding: "18px 28px 0", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid rgba(99,102,241,0.15)", paddingBottom: 16, flexShrink: 0 }}>
        {/* Back button */}
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
          <I.ArrowLeft size={20} />
        </button>
        {/* Logo mark */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>N</div>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "#f1f5f9" }}>
            NexusOps <span style={{ color: "#6366f1" }}>/ GraphView</span>
          </h1>
          <p style={{ margin: 0, fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>DEPENDENCY GRAPH · WORKSPACE {WORKSPACE_ID.slice(-6).toUpperCase()}</p>
        </div>

        <div style={{ flex: 1 }} />

        {/* Progress pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "6px 14px" }}>
          <div style={{ width: 80, height: 4, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{progress}% DONE</span>
        </div>

        {usingMock && (
          <div style={{ fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "4px 10px", letterSpacing: "0.06em" }}>
            DEMO DATA
          </div>
        )}
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 220, background: "#080e1a", borderRight: "1px solid rgba(99,102,241,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>

          {/* Stats */}
          <div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", marginBottom: 10 }}>TASK OVERVIEW</div>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  <span style={{ fontSize: 10, color: "#64748b" }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: stats[key] ? meta.color : "#334155" }}>{stats[key] || 0}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "#475569" }}>Total</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>{total}</span>
            </div>
          </div>

          {/* Filter */}
          <div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", marginBottom: 10 }}>FILTER BY STATUS</div>
            {[{ key: "all", label: "All Nodes", color: "#6366f1" }, ...Object.entries(STATUS_META).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))].map(f => (
              <button key={f.key} className="status-pill" onClick={() => setFilter(f.key)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", marginBottom: 4, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: filterStatus === f.key ? 600 : 400, background: filterStatus === f.key ? `${f.color}22` : "transparent", color: filterStatus === f.key ? f.color : "#64748b", outline: filterStatus === f.key ? `1px solid ${f.color}44` : "none" }}>
                {f.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", marginBottom: 10 }}>NODE SIZE = PRIORITY</div>
            {[["critical", 22, "#ef4444"], ["high", 18, "#f59e0b"], ["medium", 15, "#6366f1"], ["low", 12, "#64748b"]].map(([p, r, c]) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: r * 1.2, height: r * 1.2, borderRadius: "50%", border: `2px solid ${c}`, background: `${c}18`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{p}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", fontSize: 9, color: "#334155", lineHeight: 1.6 }}>
            <div>🖱 Drag nodes to reposition</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click node for details</div>
          </div>
        </aside>

        {/* ── Graph Canvas ── */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {loading ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em" }}>LOADING GRAPH…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color: "#ef4444", fontSize: 12 }}>⚠ {error}</div>
            </div>
          ) : (
            <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
          )}

          {/* Selected node card */}
          {selected && (
            <div className="node-card" style={{ position: "absolute", top: 16, right: 16, width: 220, background: "#0d1626", border: `1px solid ${STATUS_META[selected.status]?.color || "#334155"}44`, borderRadius: 12, padding: 16, boxShadow: `0 0 30px ${STATUS_META[selected.status]?.color || "#334155"}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3, flex: 1 }}>{selected.title}</div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, lineHeight: 1, marginLeft: 8 }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>STATUS</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_META[selected.status]?.color }}>{(STATUS_META[selected.status]?.label || selected.status).toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>PRIORITY</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: selected.priority === "critical" ? "#ef4444" : selected.priority === "high" ? "#f59e0b" : "#94a3b8" }}>{(selected.priority || "—").toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>ID</span>
                  <span style={{ fontSize: 9, color: "#334155" }}>{selected.id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
              {/* Status bar */}
              <div style={{ marginTop: 12, height: 2, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: selected.status === "done" ? "100%" : selected.status === "inprogress" ? "55%" : selected.status === "review" ? "75%" : "0%", background: STATUS_META[selected.status]?.color, borderRadius: 2, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {/* Corner watermark */}
          <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 9, color: "#1e293b", letterSpacing: "0.15em" }}>NEXUSOPS · GRAPH ENGINE v1.0</div>
        </div>
      </div>
    </div>
  );
}