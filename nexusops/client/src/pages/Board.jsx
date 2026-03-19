import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { taskSocket } from "../utils/socket";
import toast from "react-hot-toast";
import { Plus, ArrowLeft } from "lucide-react";

const COLUMNS = [
  { id: "todo", label: "📋 To Do", color: "border-gray-600" },
  { id: "inprogress", label: "⚡ In Progress", color: "border-blue-500" },
  { id: "review", label: "👀 Review", color: "border-yellow-500" },
  { id: "done", label: "✅ Done", color: "border-green-500" },
];

const PRIORITY_COLORS = {
  low: "bg-gray-600", medium: "bg-blue-600", high: "bg-orange-500", critical: "bg-red-600"
};

const BASE = "http://localhost:5002";
const ANALYTICS = "http://localhost:5004";

export default function Board() {
  const navigate = useNavigate();
  const workspaceId = localStorage.getItem("workspaceId");
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "" });
  const [predicting, setPredicting] = useState(false);

  const token = localStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

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
      const res = await fetch(`${BASE}/tasks/workspace/${workspaceId}`, { headers });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { toast.error("Failed to load tasks"); setTasks([]); }
  };

  const predictPriority = async (title) => {
    if (!title || title.length < 3) return;
    setPredicting(true);
    try {
      const res = await fetch(`${ANALYTICS}/analytics/predict-priority`, {
        method: "POST", headers, body: JSON.stringify({ title })
      });
      const data = await res.json();
      setForm(f => ({ ...f, priority: data.priority }));
      toast.success(`🤖 ML predicted: ${data.priority} priority`);
    } catch (err) {}
    setPredicting(false);
  };

  const createTask = async () => {
    try {
      const res = await fetch(`${BASE}/tasks`, {
        method: "POST", headers, body: JSON.stringify({ ...form, workspaceId })
      });
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "" });
      toast.success("Task created!");
    } catch (err) { toast.error("Failed to create task"); }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const res = await fetch(`${BASE}/tasks/${taskId}`, {
        method: "PUT", headers, body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
    } catch (err) { toast.error("Failed to update task"); }
  };

  const handleDragStart = (e, task) => { setDragging(task); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (dragging && dragging.status !== columnId) moveTask(dragging._id, columnId);
    setDragging(null);
  };
  const getColumnTasks = (columnId) => tasks.filter(t => t.status === columnId);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
        <h1 className="text-2xl font-bold">⚡ Kanban Board</h1>
        <span className="text-gray-400 text-sm">Real-time • {tasks.length} tasks</span>
        <button onClick={() => setShowCreate(true)} className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
          <Plus size={18}/> New Task
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="col-span-2 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 outline-none"
              placeholder="Task title" value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              onBlur={e => predictPriority(e.target.value)} />
            <input className="col-span-2 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 outline-none"
              placeholder="Description" value={form.description}
              onChange={e => setForm({...form, description: e.target.value})} />
            <select className="bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 outline-none"
              value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input type="date" className="bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 outline-none"
              value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
          </div>
          {predicting && <p className="text-blue-400 text-sm mt-2">🤖 ML predicting priority...</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={createTask} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.id)}
            className={`bg-gray-900 rounded-xl border-t-2 ${col.color} p-4 min-h-96`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{col.label}</h3>
              <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">{getColumnTasks(col.id).length}</span>
            </div>
            <div className="space-y-3">
              {getColumnTasks(col.id).map(task => (
                <div key={task._id} draggable onDragStart={e => handleDragStart(e, task)}
                  className="bg-gray-800 rounded-lg p-4 cursor-grab border border-gray-700 hover:border-gray-500 transition">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white shrink-0 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                  </div>
                  {task.description && <p className="text-gray-400 text-xs mb-2">{task.description}</p>}
                  {task.dueDate && <p className="text-gray-500 text-xs">📅 {new Date(task.dueDate).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
