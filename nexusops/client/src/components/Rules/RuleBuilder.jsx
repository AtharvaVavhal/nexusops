import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import toast from "react-hot-toast";
import { Zap, Plus, Trash2, Play, Save, ArrowLeft, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

// ── Matches real Rule model schema ────────────────────────────────────────────
// Rule: { name, workspaceId, logic: "AND"|"OR", conditions: [{field,operator,value}], actions: [{type,params}], active }

const FIELD_OPTIONS = [
  { value: "priority",   label: "Task Priority",   type: "enum",   enums: ["low","medium","high","critical"] },
  { value: "status",     label: "Task Status",     type: "enum",   enums: ["todo","inprogress","review","done"] },
  { value: "title",      label: "Task Title",      type: "string" },
  { value: "dueDate",    label: "Due Date (days)", type: "number" },
  { value: "assignee",   label: "Assignee Name",   type: "string" },
];

const OPERATORS = {
  enum:   [{ v: "equals", l: "equals" }, { v: "not_equals", l: "not equals" }],
  string: [{ v: "contains", l: "contains" }, { v: "equals", l: "equals" }, { v: "not_equals", l: "not equals" }],
  number: [{ v: "greater_than", l: ">" }, { v: "less_than", l: "<" }, { v: "equals", l: "=" }],
};

const ACTION_TYPES = [
  { value: "set_priority", label: "⚡ Set Priority",    color: "#f59e0b", params: { priority: ["low","medium","high","critical"] } },
  { value: "set_status",   label: "🔀 Set Status",     color: "#818cf8", params: { status: ["todo","inprogress","review","done"] } },
  { value: "notify",       label: "🔔 Send Notification", color: "#6366f1", params: { message: "text" } },
  { value: "add_tag",      label: "🏷 Add Tag",         color: "#10b981", params: { tag: "text" } },
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
    actions: [{ type: "notify", params: { message: "Rule triggered!" } }],
    active: true,
    _isNew: true,
  };
}

// ── ConditionRow ──────────────────────────────────────────────────────────────
function ConditionRow({ cond, onChange, onRemove, isOnly }) {
  const field = FIELD_OPTIONS.find(f => f.value === cond.field) || FIELD_OPTIONS[0];
  const ops   = OPERATORS[field.type] || OPERATORS.string;

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg border border-gray-800">
      {/* Field */}
      <select value={cond.field} onChange={e => onChange({ ...cond, field: e.target.value, operator: OPERATORS[FIELD_OPTIONS.find(f=>f.value===e.target.value)?.type || "string"][0].v, value: "" })}
        className="bg-gray-900 border border-gray-700 text-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 130 }}>
        {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Operator */}
      <select value={cond.operator} onChange={e => onChange({ ...cond, operator: e.target.value })}
        className="bg-gray-900 border border-gray-700 text-indigo-300 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 90 }}>
        {ops.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      {/* Value */}
      {field.type === "enum" ? (
        <select value={cond.value} onChange={e => onChange({ ...cond, value: e.target.value })}
          className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1">
          {field.enums.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      ) : (
        <input type={field.type === "number" ? "number" : "text"} value={cond.value}
          onChange={e => onChange({ ...cond, value: e.target.value })}
          placeholder="value"
          className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1" />
      )}

      <button onClick={onRemove} disabled={isOnly}
        className="p-1.5 rounded-md border border-transparent hover:border-red-800 hover:text-red-400 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── ActionRow ─────────────────────────────────────────────────────────────────
function ActionRow({ action, onChange }) {
  const actionMeta = ACTION_TYPES.find(a => a.value === action.type) || ACTION_TYPES[0];
  const paramKeys  = Object.keys(actionMeta.params || {});

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
      <select value={action.type} onChange={e => onChange({ type: e.target.value, params: {} })}
        className="bg-gray-900 border border-gray-700 text-gray-200 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500" style={{ minWidth: 160 }}>
        {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {paramKeys.map(key => {
        const val = actionMeta.params[key];
        return Array.isArray(val) ? (
          <select key={key} value={action.params[key] || val[0]} onChange={e => onChange({ ...action, params: { ...action.params, [key]: e.target.value } })}
            className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1">
            {val.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : (
          <input key={key} type="text" placeholder={key} value={action.params[key] || ""}
            onChange={e => onChange({ ...action, params: { ...action.params, [key]: e.target.value } })}
            className="bg-gray-900 border border-gray-700 text-yellow-400 rounded-md px-2 py-1.5 text-xs outline-none focus:border-indigo-500 flex-1" />
        );
      })}
    </div>
  );
}

// ── RuleCard ──────────────────────────────────────────────────────────────────
function RuleCard({ rule, onUpdate, onDelete, onTest, onSave, saving }) {
  const [open, setOpen] = useState(!!rule._isNew);

  const updateCond = (id, updated) => {
    onUpdate({ ...rule, conditions: rule.conditions.map(c => c.id === id ? updated : c) });
  };
  const removeCond = id => {
    onUpdate({ ...rule, conditions: rule.conditions.filter(c => c.id !== id) });
  };

  return (
    <div className="bg-gray-900 border rounded-xl overflow-hidden transition-all" style={{ borderColor: rule.active ? "rgba(99,102,241,0.3)" : "rgba(55,65,81,0.6)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}
        style={{ background: open ? "rgba(99,102,241,0.05)" : "transparent" }}>

        {/* Active toggle */}
        <button onClick={e => { e.stopPropagation(); onUpdate({ ...rule, active: !rule.active }); }}
          className="transition" style={{ color: rule.active ? "#6366f1" : "#475569" }}>
          {rule.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        <input value={rule.name} onClick={e => e.stopPropagation()}
          onChange={e => onUpdate({ ...rule, name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-transparent focus:border-indigo-700 transition"
          style={{ color: rule.active ? "#f1f5f9" : "#64748b" }} />

        <div className="flex items-center gap-2 text-xs text-gray-600">
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

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-800">
          {/* Logic toggle */}
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

          {/* Action */}
          <div className="mt-4">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">→ Then Action</div>
            <ActionRow action={rule.actions[0] || { type: "notify", params: {} }}
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

  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // ── Load rules from backend ───────────────────────────────────────────────
  useEffect(() => {
    API.get(`http://localhost:5004/rules/${workspaceId}`)
      .then(res => setRules((res.data || []).map(r => ({ ...r, conditions: r.conditions.map(c => ({ ...c, id: uid() })) }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // ── Save individual rule ─────────────────────────────────────────────────
  const saveRule = async (rule) => {
    setSavingId(rule._id || rule.name);
    const payload = {
      name:        rule.name,
      workspaceId,
      logic:       rule.logic,
      conditions:  rule.conditions.map(({ id, ...c }) => c), // strip local id
      actions:     rule.actions,
      active:      rule.active,
    };
    try {
      if (rule._id) {
        const { data } = await API.put(`http://localhost:5004/rules/${rule._id}`, payload);
        setRules(prev => prev.map(r => r._id === rule._id ? { ...data, conditions: data.conditions.map(c => ({ ...c, id: uid() })), _isNew: false } : r));
        toast.success("Rule updated!");
      } else {
        const { data } = await API.post("http://localhost:5004/rules", payload);
        setRules(prev => prev.map(r => r === rule ? { ...data, conditions: data.conditions.map(c => ({ ...c, id: uid() })), _isNew: false } : r));
        toast.success("Rule created!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save rule");
    }
    setSavingId(null);
  };

  // ── Delete rule ──────────────────────────────────────────────────────────
  const deleteRule = async (rule) => {
    if (rule._isNew) { setRules(prev => prev.filter(r => r !== rule)); return; }
    try {
      await API.delete(`http://localhost:5004/rules/${rule._id}`);
      setRules(prev => prev.filter(r => r._id !== rule._id));
      toast.success("Rule deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ── Test rule ────────────────────────────────────────────────────────────
  const testRule = async (rule) => {
    // POST to evaluate with a dummy task
    try {
      const { data } = await API.post("http://localhost:5004/rules/evaluate", {
        task: { title: "Test task", priority: "high", status: "inprogress" },
        workspaceId,
      });
      toast.success(`${data.triggeredRules?.length || 0} rule(s) would trigger`);
    } catch {
      // Optimistic UI: simulate
      const would = rule.active && rule.conditions.length > 0;
      toast.success(would ? `"${rule.name}" would trigger` : "No trigger on sample task");
    }
  };

  const updateRule = useCallback((updated) => {
    setRules(prev => prev.map(r => (r._id === updated._id && r._id) ? updated : r === updated || (!r._id && !updated._id && r.name === updated.name) ? updated : r));
  }, []);

  const activeCount  = rules.filter(r => r.active).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap'); select,input{outline:none;}`}</style>

      {/* Header */}
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
        {/* Rules list */}
        <div className="flex-1 flex flex-col gap-3">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">
              <Zap size={32} className="mb-3 text-gray-700" />
              <p className="text-sm mb-1">No rules yet</p>
              <p className="text-xs">Click "New Rule" to create your first automation</p>
            </div>
          ) : rules.map((rule, i) => (
            <RuleCard key={rule._id || i} rule={rule}
              onUpdate={updated => setRules(prev => prev.map((r, j) => j === i ? updated : r))}
              onDelete={deleteRule} onTest={testRule} onSave={saveRule}
              saving={savingId === (rule._id || rule.name)} />
          ))}
        </div>

        {/* Sidebar */}
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