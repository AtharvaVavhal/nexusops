import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import toast from "react-hot-toast";
import { Zap, Plus, Trash2, Play, Save, ArrowLeft, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

// ── Matches real Rule model + ruleEngine.js ───────────────────────────────────

const FIELD_OPTIONS = [
  { value: "priority",   label: "Task Priority",   type: "enum",   enums: ["low","medium","high","critical"] },
  { value: "status",     label: "Task Status",     type: "enum",   enums: ["todo","inprogress","review","done"] },
  { value: "title",      label: "Task Title",      type: "string" },
  { value: "dueDate",    label: "Due Date (days)", type: "number" },
  { value: "assignee",   label: "Assignee Name",   type: "string" },
];

const OPERATORS = {
  enum:   [{ v: "equals", l: "equals" }, { v: "not_equals", l: "not equals" }],
  string: [{ v: "contains", l: "contains" }, { v: "equals", l: "equals" }, { v: "not_equals", l: "not equals" }, { v: "is_empty", l: "is empty" }, { v: "is_not_empty", l: "is not empty" }],
  number: [{ v: "greater_than", l: ">" }, { v: "less_than", l: "<" }, { v: "equals", l: "=" }],
};

// ── ACTION_TYPES match ruleEngine.js executeAction() switch cases exactly ─────
// "change_status"    → task.status = action.value
// "change_priority"  → task.priority = action.value
// "notify_workspace" → io.emit("rule:triggered", { message: action.message })
// "escalate"         → task.priority = "critical" + io.emit (no params needed)
// "auto_assign"      → task.assignee = action.value
const ACTION_TYPES = [
  { value: "change_priority",  label: "⚡ Change Priority",      color: "#f59e0b", paramType: "select", paramKey: "value",   options: ["low","medium","high","critical"] },
  { value: "change_status",    label: "🔀 Change Status",        color: "#818cf8", paramType: "select", paramKey: "value",   options: ["todo","inprogress","review","done"] },
  { value: "notify_workspace", label: "🔔 Notify Workspace",     color: "#6366f1", paramType: "text",   paramKey: "message" },
  { value: "escalate",         label: "🚨 Escalate to Critical", color: "#ef4444", paramType: "none" },
  { value: "auto_assign",      label: "👤 Auto Assign",          color: "#10b981", paramType: "text",   paramKey: "value" },
];

let _uid = 1;
const uid = () => `c${_uid++}`;

function newCondition() {
  return { id: uid(), field: "priority", operator: "equals", value: "high" };
}

function newRule(workspaceId) {
  return {
    _id: null,
    name: "New Rule",
    workspaceId,
    logic: "AND",
    conditions: [newCondition()],
    // Action shape must be { type, value?, message? } — NOT { type, params: {...} }
    actions: [{ type: "notify_workspace", message: "Rule triggered!" }],
    active: true,
    _isNew: true,
  };
}

// ── ConditionRow ──────────────────────────────────────────────────────────────
function ConditionRow({ cond, onChange, onRemove, isOnly }) {
  const field = FIELD_OPTIONS.find(f => f.value === cond.field) || FIELD_OPTIONS[0];
  const ops   = OPERATORS[field.type] || OPERATORS.string;
  const noValueOps = ["is_empty", "is_not_empty"];
  const needsValue = !noValueOps.includes(cond.operator);

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg border border-gray-800">
      <select value={cond.field}
        onChange={e => {
          const f = FIELD_OPTIONS.find(x => x.value === e.target.value) || FIELD_OPTIONS[0];
          onChange({ ...cond, field: e.target.value, operator: OPERATORS[f.type][0].v, value: "" });
        }}
        className="bg-gray-900 border border-gray-700 text-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 130 }}>
        {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select value={cond.operator} onChange={e => onChange({ ...cond, operator: e.target.value })}
        className="bg-gray-900 border border-gray-700 text-indigo-300 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 110 }}>
        {ops.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      {needsValue && (
        field.type === "enum" ? (
          <select value={cond.value} onChange={e => onChange({ ...cond, value: e.target.value })}
            className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1">
            {(field.enums || []).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        ) : (
          <input type={field.type === "number" ? "number" : "text"} value={cond.value}
            onChange={e => onChange({ ...cond, value: e.target.value })}
            placeholder="value"
            className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1" />
        )
      )}
      {!needsValue && <div className="flex-1 text-xs text-gray-600 italic px-2">no value needed</div>}

      <button onClick={onRemove} disabled={isOnly}
        className="p-1.5 rounded-md border border-transparent hover:border-red-800 hover:text-red-400 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── ActionRow — writes action.value / action.message directly (no nested params)
function ActionRow({ action, onChange }) {
  const meta = ACTION_TYPES.find(a => a.value === action.type) || ACTION_TYPES[0];

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
      <select value={action.type}
        onChange={e => {
          const m = ACTION_TYPES.find(a => a.value === e.target.value);
          const base = { type: e.target.value };
          if (m?.paramType === "select") base.value = m.options[0];
          if (m?.paramType === "text")   base[m.paramKey] = "";
          onChange(base);
        }}
        className="bg-gray-900 border border-gray-700 text-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 190 }}>
        {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {meta.paramType === "select" && (
        <select value={action.value || meta.options[0]}
          onChange={e => onChange({ ...action, value: e.target.value })}
          className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1">
          {meta.options.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}

      {meta.paramType === "text" && (
        <input type="text" placeholder={meta.paramKey}
          value={action[meta.paramKey] || ""}
          onChange={e => onChange({ ...action, [meta.paramKey]: e.target.value })}
          className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1" />
      )}

      {meta.paramType === "none" && (
        <span className="text-xs text-gray-600 flex-1 italic">Fires immediately — no parameters needed</span>
      )}
    </div>
  );
}

// ── RuleCard ──────────────────────────────────────────────────────────────────
function RuleCard({ rule, onUpdate, onDelete, onTest, onSave, saving }) {
  const [open, setOpen] = useState(!!rule._isNew);

  const updateCond = (id, updated) =>
    onUpdate({ ...rule, conditions: rule.conditions.map(c => c.id === id ? updated : c) });
  const removeCond = id =>
    onUpdate({ ...rule, conditions: rule.conditions.filter(c => c.id !== id) });

  return (
    <div className="bg-gray-900 border rounded-xl overflow-hidden transition-all" style={{ borderColor: rule.active ? "rgba(99,102,241,0.3)" : "rgba(55,65,81,0.6)" }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}
        style={{ background: open ? "rgba(99,102,241,0.05)" : "transparent" }}>

        <button onClick={e => { e.stopPropagation(); onUpdate({ ...rule, active: !rule.active }); }}
          className="transition flex-shrink-0" style={{ color: rule.active ? "#6366f1" : "#475569" }}>
          {rule.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        <input value={rule.name} onClick={e => e.stopPropagation()}
          onChange={e => onUpdate({ ...rule, name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-indigo-700 transition min-w-0"
          style={{ color: rule.active ? "#f1f5f9" : "#64748b" }} />

        <div className="flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
          <span className="px-2 py-0.5 rounded-full" style={{ background: rule.logic === "AND" ? "rgba(99,102,241,0.15)" : "rgba(245,158,11,0.15)", color: rule.logic === "AND" ? "#818cf8" : "#f59e0b" }}>{rule.logic}</span>
          <span>{rule.conditions.length} cond</span>
        </div>

        <button onClick={e => { e.stopPropagation(); onTest(rule); }}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-400 flex items-center gap-1 transition">
          <Play size={11} /> Test
        </button>
        <button onClick={e => { e.stopPropagation(); onSave(rule); }} disabled={saving}
          className="px-3 py-1 border rounded-lg text-xs flex items-center gap-1 transition" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#818cf8" }}>
          <Save size={11} /> {saving ? "…" : "Save"}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(rule); }}
          className="p-1.5 hover:text-red-400 text-gray-600 transition"><Trash2 size={15} /></button>
        {open ? <ChevronUp size={15} className="text-gray-600" /> : <ChevronDown size={15} className="text-gray-600" />}
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mt-4 mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Conditions</span>
            <button onClick={() => onUpdate({ ...rule, logic: rule.logic === "AND" ? "OR" : "AND" })}
              className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition"
              style={{ background: rule.logic === "AND" ? "rgba(99,102,241,0.15)" : "rgba(245,158,11,0.15)", borderColor: rule.logic === "AND" ? "rgba(99,102,241,0.35)" : "rgba(245,158,11,0.35)", color: rule.logic === "AND" ? "#818cf8" : "#f59e0b" }}>
              {rule.logic} — click to toggle
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {rule.conditions.map((c, i) => (
              <div key={c.id}>
                {i > 0 && <div className="text-center text-xs py-1" style={{ color: rule.logic === "AND" ? "#6366f1" : "#f59e0b" }}>{rule.logic}</div>}
                <ConditionRow cond={c} onChange={u => updateCond(c.id, u)} onRemove={() => removeCond(c.id)} isOnly={rule.conditions.length === 1} />
              </div>
            ))}
            <button onClick={() => onUpdate({ ...rule, conditions: [...rule.conditions, newCondition()] })}
              className="px-4 py-2 border border-dashed border-gray-700 rounded-lg text-xs text-gray-600 hover:text-indigo-400 hover:border-indigo-700 transition text-left">
              + Add Condition
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">→ Then Action</div>
            <ActionRow
              action={rule.actions[0] || { type: "notify_workspace", message: "" }}
              onChange={a => onUpdate({ ...rule, actions: [a] })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RuleBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspaceId = localStorage.getItem("workspaceId") || "69bb975accdf1384f3017e3f";

  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    API.get(`http://localhost:5004/rules/${workspaceId}`)
      .then(res => setRules((res.data || []).map(r => ({
        ...r,
        conditions: (r.conditions || []).map(c => ({ ...c, id: uid() }))
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const saveRule = async (rule) => {
    setSavingId(rule._id || rule.name);
    const payload = {
      name:       rule.name,
      workspaceId,
      logic:      rule.logic,
      active:     rule.active,
      conditions: rule.conditions.map(({ id, ...c }) => c), // strip local React id
      actions:    rule.actions,                              // { type, value?, message? } — correct shape
    };
    try {
      if (rule._id) {
        const { data } = await API.put(`http://localhost:5004/rules/${rule._id}`, payload);
        setRules(prev => prev.map(r => r._id === rule._id
          ? { ...data, conditions: data.conditions.map(c => ({ ...c, id: uid() })), _isNew: false }
          : r));
        toast.success("Rule updated!");
      } else {
        const { data } = await API.post("http://localhost:5004/rules", payload);
        setRules(prev => prev.map(r => r === rule
          ? { ...data, conditions: data.conditions.map(c => ({ ...c, id: uid() })), _isNew: false }
          : r));
        toast.success("Rule created!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save rule");
    }
    setSavingId(null);
  };

  const deleteRule = async (rule) => {
    if (rule._isNew) { setRules(prev => prev.filter(r => r !== rule)); return; }
    try {
      await API.delete(`http://localhost:5004/rules/${rule._id}`);
      setRules(prev => prev.filter(r => r._id !== rule._id));
      toast.success("Rule deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const testRule = async (rule) => {
    try {
      const { data } = await API.post("http://localhost:5004/rules/evaluate", {
        task: { title: "Test task", priority: "high", status: "inprogress" },
        workspaceId,
      });
      const count = data.triggeredRules?.length || 0;
      toast.success(count ? `${count} rule(s) triggered on test task` : "No rules triggered on test task");
    } catch {
      toast.success(rule.active && rule.conditions.length > 0
        ? `"${rule.name}" would trigger`
        : "No trigger on sample task");
    }
  };

  const updateRule = useCallback((updated) => {
    setRules(prev => prev.map(r =>
      (r._id && r._id === updated._id) || r === updated ? updated : r
    ));
  }, []);

  const activeCount = rules.filter(r => r.active).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap'); select,input{outline:none;}`}</style>

      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Zap size={20} className="text-indigo-400" /> Rule Builder</h1>
          <p className="text-gray-500 text-xs mt-0.5">VISUAL RULE ENGINE · {activeCount} ACTIVE RULE{activeCount !== 1 ? "S" : ""}</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => setRules(prev => [newRule(workspaceId), ...prev])}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm transition">
          <Plus size={16} /> New Rule
        </button>
      </div>

      <div className="flex gap-6 p-6">
        <div className="flex-1 flex flex-col gap-3">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">
              <Zap size={32} className="mb-3 text-gray-700" />
              <p className="text-sm mb-1">No rules yet</p>
              <p className="text-xs">Click "New Rule" to create your first automation</p>
            </div>
          ) : rules.map((rule, i) => (
            <RuleCard key={rule._id || `new-${i}`} rule={rule}
              onUpdate={updated => setRules(prev => prev.map((r, j) => j === i ? updated : r))}
              onDelete={deleteRule} onTest={testRule} onSave={saveRule}
              saving={savingId === (rule._id || rule.name)} />
          ))}
        </div>

        <div className="w-52 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Stats</p>
            {[["Total", rules.length, "#6366f1"], ["Active", activeCount, "#10b981"], ["Paused", rules.length - activeCount, "#f59e0b"]].map(([l, v, c]) => (
              <div key={l} className="flex justify-between mb-2">
                <span className="text-xs text-gray-500">{l}</span>
                <span className="text-sm font-bold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">How it works</p>
            {[["1","Set conditions","#6366f1"],["2","Choose AND / OR","#818cf8"],["3","Pick an action","#f59e0b"],["4","Save & enable","#10b981"]].map(([n,t,c]) => (
              <div key={n} className="flex items-start gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{n}</div>
                <span className="text-xs text-gray-500 leading-relaxed">{t}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Available Actions</p>
            {ACTION_TYPES.map(a => (
              <div key={a.value} className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span className="text-xs text-gray-500">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}