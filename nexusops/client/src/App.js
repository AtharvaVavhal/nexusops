import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Existing pages
import Login     from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Board     from "./pages/Board";

// New pages
import GraphView   from "./pages/GraphView";
import Analytics   from "./pages/Analytics";
import RuleBuilder from "./pages/RuleBuilder";
import DocEditor   from "./pages/DocEditor";

// ── Auth guard ────────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{ style: { background: "#1f2937", color: "#fff", border: "1px solid #374151", fontSize: "13px" } }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/board"     element={<PrivateRoute><Board /></PrivateRoute>} />
          <Route path="/graph"     element={<PrivateRoute><GraphView /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/rules"     element={<PrivateRoute><RuleBuilder /></PrivateRoute>} />
          <Route path="/docs"      element={<PrivateRoute><DocEditor /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;