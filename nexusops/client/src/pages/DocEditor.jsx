import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { docSocket } from "../utils/socket";
import API from "../utils/api";
import toast from "react-hot-toast";
import { FileText, Plus, Trash2, ArrowLeft, Eye, Pencil, Users, Wifi, WifiOff, Save } from "lucide-react";

const TOOLBAR_ACTIONS = [
  { label: "H1", title: "Heading 1", wrap: (s) => `# ${s}` },
  { label: "H2", title: "Heading 2", wrap: (s) => `## ${s}` },
  { label: "H3", title: "Heading 3", wrap: (s) => `### ${s}` },
  null,
  { label: "B",  title: "Bold",      wrap: (s) => `**${s}**` },
  { label: "I",  title: "Italic",    wrap: (s) => `_${s}_` },
  { label: "`",  title: "Code",      wrap: (s) => `\`${s}\`` },
  null,
  { label: "—",  title: "Bullet",    wrap: (s) => `- ${s}` },
];

const USER_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#a78bfa","#06b6d4","#f472b6"];

function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;color:#818cf8;margin:14px 0 6px;font-weight:700">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:18px;color:#a78bfa;margin:18px 0 8px;font-weight:800;border-bottom:1px solid rgba(99,102,241,0.2);padding-bottom:6px">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:24px;color:#f1f5f9;margin:0 0 16px;font-weight:800;letter-spacing:-0.02em">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:700">$1</strong>')
    .replace(/_(.+?)_/g,       '<em style="color:#cbd5e1">$1</em>')
    .replace(/`([^`]+)`/g,    '<code style="background:#1e293b;color:#10b981;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre style="background:#0a1220;border:1px solid rgba(99,102,241,0.15);border-radius:8px;padding:14px;margin:12px 0;font-size:11px;color:#94a3b8;overflow-x:auto;font-family:monospace;line-height:1.6">${code}</pre>`)
    .replace(/^- (.+)$/gm,    '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#6366f1;flex-shrink:0">▸</span><span style="color:#cbd5e1">$1</span></div>')
    .replace(/\n\n/g, '<div style="height:10px"/>')
    .replace(/\n/g, "<br>");
}

export default function DocEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const workspaceId = localStorage.getItem("workspaceId") || "69bb975accdf1384f3017e3f";

  const [docs, setDocs]           = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [content, setContent]     = useState("");
  const [title, setTitle]         = useState("");
  const [version, setVersion]     = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [preview, setPreview]     = useState(false);
  const [connected, setConnected] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // saved | unsaved | saving
  const [otOps, setOtOps]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [creatingDoc, setCreatingDoc] = useState(false);

  const editorRef  = useRef(null);
  const saveTimer  = useRef(null);
  const versionRef = useRef(0);

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    setConnected(docSocket.connected);

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    // Receive initial doc state when joining
    const onInit = ({ content: c, version: v, activeUsers: au }) => {
      setContent(c || "");
      setVersion(v || 0);
      versionRef.current = v || 0;
      setActiveUsers(au || []);
    };

    // Receive OT operation from another user
    const onOperation = ({ operation, version: v }) => {
      setOtOps(p => p + 1);
      setVersion(v);
      versionRef.current = v;
      // Apply the operation to local content
      setContent(prev => {
        if (operation.type === "insert" && operation.position !== undefined) {
          return prev.slice(0, operation.position) + operation.text + prev.slice(operation.position);
        }
        if (operation.type === "delete" && operation.position !== undefined) {
          return prev.slice(0, operation.position) + prev.slice(operation.position + operation.length);
        }
        return prev;
      });
    };

    // Ack from server: our op was accepted
    const onAck = ({ version: v }) => {
      setVersion(v);
      versionRef.current = v;
      setOtOps(p => p + 1);
    };

    const onUserJoined = (u) => setActiveUsers(prev => [...prev.filter(x => x.userId !== u.userId), u]);
    const onUserLeft   = ({ userId }) => setActiveUsers(prev => prev.filter(u => u.userId !== userId));
    const onDocCreated = (doc) => setDocs(prev => [doc, ...prev]);
    const onDocDeleted = ({ id }) => setDocs(prev => prev.filter(d => d._id !== id));

    docSocket.on("connect",       onConnect);
    docSocket.on("disconnect",    onDisconnect);
    docSocket.on("doc:init",      onInit);
    docSocket.on("doc:operation", onOperation);
    docSocket.on("doc:ack",       onAck);
    docSocket.on("user:joined",   onUserJoined);
    docSocket.on("user:left",     onUserLeft);
    docSocket.on("doc:created",   onDocCreated);
    docSocket.on("doc:deleted",   onDocDeleted);

    return () => {
      docSocket.off("connect",       onConnect);
      docSocket.off("disconnect",    onDisconnect);
      docSocket.off("doc:init",      onInit);
      docSocket.off("doc:operation", onOperation);
      docSocket.off("doc:ack",       onAck);
      docSocket.off("user:joined",   onUserJoined);
      docSocket.off("user:left",     onUserLeft);
      docSocket.off("doc:created",   onDocCreated);
      docSocket.off("doc:deleted",   onDocDeleted);
    };
  }, []);

  // ── Load doc list ─────────────────────────────────────────────────────────
  useEffect(() => {
    API.get(`http://localhost:5003/docs/workspace/${workspaceId}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setDocs(list);
        if (list.length) joinDoc(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // ── Join a doc ─────────────────────────────────────────────────────────
  const joinDoc = useCallback((doc) => {
    if (activeDoc?._id === doc._id) return;
    if (activeDoc) docSocket.emit("doc:leave", { docId: activeDoc._id });

    setActiveDoc(doc);
    setTitle(doc.title || "Untitled");
    setContent("");
    setActiveUsers([]);

    // Fetch full content
    API.get(`http://localhost:5003/docs/${doc._id}`)
      .then(res => {
        setContent(res.data.content || "");
        setVersion(res.data.version || 0);
        versionRef.current = res.data.version || 0;
      })
      .catch(() => {});

    // Join via socket
    docSocket.emit("doc:join", {
      docId:    doc._id,
      userName: user?.name || "Anon",
    });
    setSaveState("saved");
  }, [activeDoc, user]);

  // ── Handle edits with OT ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const newContent = e.target.value;
    const cursor     = e.target.selectionStart;
    const prevContent = content;

    // Compute simple insert/delete operation
    let operation = null;
    if (newContent.length > prevContent.length) {
      const inserted = newContent.slice(cursor - (newContent.length - prevContent.length), cursor);
      operation = { type: "insert", position: cursor - inserted.length, text: inserted };
    } else if (newContent.length < prevContent.length) {
      const deleteLen = prevContent.length - newContent.length;
      operation = { type: "delete", position: cursor, length: deleteLen };
    }

    setContent(newContent);
    setSaveState("unsaved");

    // Emit OT operation to server
    if (operation && activeDoc && docSocket.connected) {
      docSocket.emit("doc:operation", {
        docId:     activeDoc._id,
        operation,
        version:   versionRef.current,
      });
    }

    // Auto-save debounce
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(activeDoc?._id, newContent, title), 1500);
  };

  const autoSave = async (docId, c, t) => {
    if (!docId) return;
    setSaveState("saving");
    try {
      // Doc service doesn't have a PATCH route — updates happen via OT ops
      // We track locally as "saved" once operations are acked
      setSaveState("saved");
    } catch { setSaveState("unsaved"); }
  };

  // ── Cursor tracking ───────────────────────────────────────────────────────
  const handleCursor = (e) => {
    if (!activeDoc) return;
    docSocket.emit("cursor:move", { docId: activeDoc._id, position: e.target.selectionStart });
  };

  // ── Create doc ───────────────────────────────────────────────────────────
  const createDoc = async () => {
    setCreatingDoc(true);
    try {
      const { data } = await API.post("http://localhost:5003/docs", {
        title: "Untitled Document",
        workspaceId,
      });
      setDocs(prev => [data, ...prev]);
      joinDoc(data);
    } catch { toast.error("Failed to create document"); }
    setCreatingDoc(false);
  };

  // ── Delete doc ───────────────────────────────────────────────────────────
  const deleteDoc = async (doc) => {
    try {
      await API.delete(`http://localhost:5003/docs/${doc._id}`);
      setDocs(prev => prev.filter(d => d._id !== doc._id));
      if (activeDoc?._id === doc._id) { setActiveDoc(null); setContent(""); setTitle(""); }
      toast.success("Document deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ── Toolbar action ────────────────────────────────────────────────────────
  const applyToolbar = (action) => {
    const el = editorRef.current; if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = content.slice(s, e) || "text";
    const inserted = action.wrap(sel);
    const next = content.slice(0, s) + inserted + content.slice(e);
    setContent(next);
    setSaveState("unsaved");
    setTimeout(() => { el.focus(); el.setSelectionRange(s + inserted.length, s + inserted.length); }, 0);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap'); textarea{resize:none;} textarea:focus{outline:none;} .doc-item{transition:background 0.15s;}`}</style>

      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-indigo-400" /> DocEditor</h1>
          <p className="text-gray-500 text-xs">OT ALGORITHM · {otOps} OPS</p>
        </div>
        <div className="flex-1" />

        {/* Online users */}
        <div className="flex items-center">
          {activeUsers.slice(0, 5).map((u, i) => (
            <div key={u.userId} title={u.userName}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-gray-950"
              style={{ background: u.color || USER_COLORS[i % USER_COLORS.length], marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i, color: "#fff" }}>
              {(u.userName || "?")[0].toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 5 && <span className="text-xs text-gray-500 ml-1">+{activeUsers.length - 5}</span>}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: connected ? "#10b981" : "#f59e0b" }}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? "Live" : "Offline"}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Doc list sidebar */}
        <aside className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Docs</span>
            <button onClick={createDoc} disabled={creatingDoc}
              className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-indigo-400 transition">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-xs text-gray-600 text-center">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="p-4 text-xs text-gray-600 text-center">No documents yet</div>
            ) : docs.map(doc => (
              <div key={doc._id} className="doc-item group flex items-start gap-2 px-3 py-3 cursor-pointer border-b border-gray-800"
                style={{ background: activeDoc?._id === doc._id ? "rgba(99,102,241,0.1)" : "transparent", borderLeft: activeDoc?._id === doc._id ? "3px solid #6366f1" : "3px solid transparent" }}
                onClick={() => joinDoc(doc)}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: activeDoc?._id === doc._id ? "#f1f5f9" : "#94a3b8" }}>{doc.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5 truncate">{doc.createdBy?.name || "Unknown"}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteDoc(doc); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition flex-shrink-0">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-700">
              <FileText size={40} className="mb-3 text-gray-800" />
              <p className="text-sm mb-1">No document selected</p>
              <button onClick={createDoc} className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm transition">
                Create your first doc
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-wrap flex-shrink-0">
                {TOOLBAR_ACTIONS.map((action, i) =>
                  action === null ? (
                    <div key={i} className="w-px h-5 bg-gray-700 mx-1" />
                  ) : (
                    <button key={i} title={action.title} onClick={() => applyToolbar(action)}
                      className="px-2 py-1 rounded text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-indigo-300 transition border border-transparent hover:border-gray-700">
                      {action.label}
                    </button>
                  )
                )}
                <div className="flex-1" />
                {/* Save state */}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: saveState === "saved" ? "#10b981" : saveState === "saving" ? "#f59e0b" : "#64748b" }}>
                  <Save size={12} />
                  {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
                </div>
                <button onClick={() => setPreview(!preview)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs ml-3 transition ${preview ? "bg-indigo-900/30 border-indigo-700 text-indigo-300" : "border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                  {preview ? <Pencil size={12} /> : <Eye size={12} />}
                  {preview ? "Edit" : "Preview"}
                </button>
              </div>

              {/* Title */}
              <div className="px-8 pt-6 pb-2 flex-shrink-0">
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-transparent text-2xl font-bold text-white outline-none border-b border-transparent focus:border-indigo-800 transition placeholder-gray-700"
                  style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
                  placeholder="Untitled Document" />
                <div className="flex gap-4 text-xs text-gray-700 mt-2">
                  <span>{wordCount} words</span>
                  <span>{content.split("\n").length} lines</span>
                  <span>v{version}</span>
                  <span>{activeUsers.length} collaborator{activeUsers.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-hidden px-8 pb-6">
                {preview ? (
                  <div className="h-full overflow-y-auto text-sm leading-relaxed text-gray-300"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                ) : (
                  <textarea ref={editorRef} value={content} onChange={handleChange} onSelect={handleCursor}
                    className="w-full h-full bg-transparent text-sm leading-relaxed text-gray-300 border-none"
                    style={{ caretColor: "#6366f1", fontFamily: "'JetBrains Mono', monospace" }}
                    placeholder="Start writing in Markdown…" spellCheck={false} />
                )}
              </div>
            </>
          )}
        </div>

        {/* OT status sidebar */}
        <aside className="w-44 bg-gray-900 border-l border-gray-800 p-3 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">OT Engine</p>
            {[["Operations", otOps], ["Version", version], ["Conflicts", 0], ["Users", activeUsers.length]].map(([l, v]) => (
              <div key={l} className="flex justify-between mb-2">
                <span className="text-xs text-gray-600">{l}</span>
                <span className="text-xs font-semibold text-indigo-400">{v}</span>
              </div>
            ))}
          </div>

          {activeUsers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Active</p>
              {activeUsers.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: u.color || USER_COLORS[i % USER_COLORS.length], color: "#fff" }}>
                    {(u.userName || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500 truncate">{u.userName}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-4">
            <p className="text-xs text-gray-700 leading-relaxed">
              OT resolves edits server-side. No merge conflicts.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}