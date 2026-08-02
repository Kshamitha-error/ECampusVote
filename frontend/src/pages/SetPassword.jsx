import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const RULES = [
  { label:"8–12 characters",              test: p => p.length>=8 && p.length<=12 },
  { label:"One uppercase letter (A–Z)",   test: p => /[A-Z]/.test(p) },
  { label:"One lowercase letter (a–z)",   test: p => /[a-z]/.test(p) },
  { label:"One number (0–9)",             test: p => /\d/.test(p) },
  { label:"One special character (@$!%*?&_#)", test: p => /[@$!%*?&_#]/.test(p) },
];

export default function SetPassword() {
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { loginStudent } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const studentId = state?.student_id;

  const allValid = RULES.every(r => r.test(password));
  const match    = password===confirm && confirm!=="";

  const canSubmit = name.trim() && allValid && match;

  const strength = RULES.filter(r => r.test(password)).length;
  const strengthColor = strength<=2 ? "#ef4444" : strength<=3 ? "#f59e0b" : strength===4 ? "#3b82f6" : "#16a34a";
  const strengthLabel = ["","Weak","Weak","Fair","Good","Strong"][strength];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await API.post("/student/auth/set-password", {
        student_id: studentId, name: name.trim(), password, confirm_password: confirm,
      });
      loginStudent(res.data.access_token, res.data.student);
      toast.success(`Welcome, ${name.trim()}! 🎉`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    } finally { setLoading(false); }
  };

  const inp = { width:"100%", padding:"13px 14px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", fontSize:16, color:"#1e293b", outline:"none", boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f6ff 0%,#e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        .inp:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.12)!important;background:#fff!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:460, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 32px", boxShadow:"0 8px 32px rgba(37,99,235,0.12)", border:"1.5px solid #dbeafe" }}>

          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:20, boxShadow:"0 4px 16px rgba(37,99,235,0.3)" }}>🔐</div>

          <h1 style={{ fontSize:22, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>Almost there!</h1>
          <p style={{ fontSize:14, color:"#64748b", marginBottom:24 }}>Enter your name and create a strong password.</p>

          {/* Name */}
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Full Name</label>
          <input className="inp" type="text" placeholder="Enter your full name" value={name} onChange={e=>setName(e.target.value)} autoCorrect="off" autoComplete="name" style={{ ...inp, marginBottom:16 }} />

          {/* Password */}
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
          <div style={{ position:"relative", marginBottom:8 }}>
            <input className="inp" type={showPass?"text":"password"} placeholder="Create a strong password" value={password} onChange={e=>setPassword(e.target.value)} style={{ ...inp, paddingRight:44 }} />
            <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flex:1, height:4, borderRadius:99, background:i<=strength ? strengthColor : "#e2e8f0", transition:"background 0.3s" }} />
                ))}
              </div>
              <div style={{ fontSize:12, color:strengthColor, fontWeight:600 }}>{strengthLabel}</div>
            </div>
          )}

          {/* Rules */}
          {password && (
            <div style={{ background:"#f8faff", borderRadius:10, padding:"12px 14px", marginBottom:14, border:"1px solid #dbeafe" }}>
              {RULES.map((rule, i) => {
                const ok = rule.test(password);
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:ok ? "#16a34a" : "#94a3b8", marginBottom:i<RULES.length-1 ? 5 : 0, transition:"color 0.2s" }}>
                    <span>{ok ? "✅" : "⭕"}</span>{rule.label}
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirm */}
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Confirm Password</label>
          <input className="inp" type="password" placeholder="Repeat your password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter" && handleSubmit()}
            style={{ ...inp, marginBottom:4, borderColor:confirm ? (match ? "#16a34a" : "#ef4444") : "#dbeafe" }} />
          {confirm && !match && <p style={{ fontSize:12, color:"#ef4444", marginBottom:16 }}>Passwords do not match</p>}
          {!confirm && <div style={{ marginBottom:16 }} />}

          <button onClick={handleSubmit} disabled={loading||!canSubmit}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:canSubmit ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#e2e8f0", color:canSubmit ? "#fff" : "#94a3b8", fontWeight:700, fontSize:15, cursor:canSubmit ? "pointer" : "not-allowed", boxShadow:canSubmit ? "0 4px 12px rgba(37,99,235,0.3)" : "none", fontFamily:"inherit", transition:"all 0.2s" }}>
            {loading ? "Setting up your account..." : "Complete Registration →"}
          </button>
        </div>
      </div>
    </div>
  );
}