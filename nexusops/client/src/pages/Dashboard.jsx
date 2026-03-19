import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import toast from "react-hot-toast";
import { LayoutDashboard, Kanban, GitBranch, FileText, Zap, BarChart2, LogOut, Plus } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState("");

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await API.get("http://localhost:5002/tasks/workspace");
      setWorkspaces(data);
    } catch (err) { console.error(err); }
  };

  const createWorkspace = async () => {
    try {
      const { data } = await API.post("http://localhost:5002/tasks/workspace", { name: wsName });
      setWorkspaces([...workspaces, data]);
      setShowCreate(false);
      setWsName("");
      toast.success("Workspace created!");
    } catch (err) { toast.error("Failed to create workspace"); }
  };

  const navItems = [
    { icon: <Kanban size={20}/>, label: "Kanban Board", path: "/board" },
    { icon: <GitBranch size={20}/>, label: "Dependency Graph", path: "/graph" },
    { icon: <FileText size={20}/>, label: "Documents", path: "/docs" },
    { icon: <Zap size={20}/>, label: "Rule Builder", path: "/rules" },
    { icon: <BarChart2 size={20}/>, label: "Analytics", path: "/analytics" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">⚡ NexusOps</h1>
          <p className="text-gray-400 text-sm mt-1">{user?.name}</p>
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{user?.role}</span>
        </div>

        <nav className="space-y-2 flex-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800 transition"
        >
          <LogOut size={20}/> Logout
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Workspaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
          >
            <Plus size={18}/> New Workspace
          </button>
        </div>

        {showCreate && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create Workspace</h3>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 outline-none mb-4"
              placeholder="Workspace name"
              value={wsName}
              onChange={e => setWsName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={createWorkspace} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition">Create</button>
              <button onClick={() => setShowCreate(false)} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <div
              key={ws._id}
              onClick={() => { localStorage.setItem("workspaceId", ws._id); navigate("/board"); }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-blue-500 transition"
            >
              <h3 className="text-lg font-semibold mb-2">{ws.name}</h3>
              <p className="text-gray-400 text-sm">{ws.members?.length} members</p>
              <p className="text-gray-500 text-xs mt-2">{new Date(ws.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {workspaces.length === 0 && (
            <div className="col-span-3 text-center text-gray-500 py-20">
              No workspaces yet. Create one to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
