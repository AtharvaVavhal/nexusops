import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: "⚡", label: "ML Priority Prediction", desc: "Naive Bayes classifier" },
  { icon: "🔗", label: "Dependency Graph",       desc: "D3.js force-directed" },
  { icon: "✍️", label: "OT Collaboration",       desc: "Conflict-free editing" },
  { icon: "⚙️", label: "Rule Engine",            desc: "No-code automation" },
  { icon: "📊", label: "Burndown Analytics",     desc: "Linear regression" },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password, form.role);
      else await login(form.email, form.password);
      toast.success("Welcome to NexusOps!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  const inputStyle = (field) => ({
    width: "100%",
    background: "#060b14",
    color: "#f1f5f9",
    border: `1px solid ${focused === field ? "#6366f1" : "rgba(99,102,241,0.2)"}`,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", display: "flex", fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        ::placeholder { color: #334155; }
        select option { background: #0d1626; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        .feat-item { animation: slideIn 0.4s ease forwards; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Left Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none", animation: "float 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "5%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none", animation: "float 8s ease-in-out infinite reverse" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif", boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>N</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: "#f1f5f9", letterSpacing: "-0.03em" }}>NexusOps</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>INTELLIGENT TEAM OS</div>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 42, color: "#f1f5f9", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 16, maxWidth: 480 }}>
          Your team,<br />
          <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>supercharged</span><br />
          with ML.
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, maxWidth: 400, marginBottom: 48 }}>
          Real-time Kanban, collaborative docs with OT algorithm, D3.js dependency graphs, and Naive Bayes ML — all in one platform.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={f.label} className="feat-item" style={{ display: "flex", alignItems: "center", gap: 14, animationDelay: `${i * 80}ms`, opacity: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "#334155" }}>{f.desc}</div>
              </div>
              <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite", animationDelay: `${i * 300}ms` }} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", width: "fit-content" }}>
          <span style={{ fontSize: 12 }}>🏆</span>
          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>Built in 48hrs for Hackathon</span>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 420, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", borderLeft: "1px solid rgba(99,102,241,0.1)", background: "rgba(8,14,26,0.8)" }}>
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", background: "#0d1626", borderRadius: 12, padding: 4, marginBottom: 32, border: "1px solid rgba(99,102,241,0.15)" }}>
            {["Sign In", "Register"].map((tab, i) => (
              <button key={tab} onClick={() => setIsRegister(i === 1)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", transition: "all 0.2s", background: (i === 1) === isRegister ? "linear-gradient(135deg,#6366f1,#818cf8)" : "transparent", color: (i === 1) === isRegister ? "#fff" : "#475569" }}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "#f1f5f9", marginBottom: 4, letterSpacing: "-0.02em" }}>
              {isRegister ? "Create account" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 11, color: "#475569" }}>
              {isRegister ? "Join NexusOps and supercharge your team" : "Sign in to your NexusOps workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isRegister && (
              <div>
                <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>FULL NAME</label>
                <input style={inputStyle("name")} placeholder="Atharva Kumar" value={form.name}
                  onFocus={() => setFocused("name")} onBlur={() => setFocused("")}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>EMAIL</label>
              <input style={inputStyle("email")} placeholder="you@nexusops.com" type="email" value={form.email}
                onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>PASSWORD</label>
              <input style={inputStyle("password")} placeholder="••••••••" type="password" value={form.password}
                onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            {isRegister && (
              <div>
                <label style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>ROLE</label>
                <select style={{ ...inputStyle("role"), cursor: "pointer" }} value={form.role}
                  onFocus={() => setFocused("role")} onBlur={() => setFocused("")}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", marginTop: 8, transition: "all 0.2s", background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 0 20px rgba(99,102,241,0.3)" }}>
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  {isRegister ? "Creating…" : "Signing in…"}
                </>
              ) : (
                isRegister ? "→ Create Account" : "→ Sign In"
              )}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(99,102,241,0.1)" }} />
            <span style={{ fontSize: 10, color: "#334155" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(99,102,241,0.1)" }} />
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => setIsRegister(!isRegister)}
              style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, marginLeft: 6 }}>
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>

          <p style={{ textAlign: "center", fontSize: 10, color: "#1e293b", marginTop: 32 }}>NEXUSOPS · HACKATHON 2025</p>
        </div>
      </div>
    </div>
  );
}