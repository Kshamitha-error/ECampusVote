import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = "eCampus Vote — Admin Login"; }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return toast.error("Enter email and password.");
    setLoading(true);
    try {
      const res = await API.post("/admin/auth/login", { email:email.trim().toLowerCase(), password });
      loginAdmin(res.data.access_token);
      toast.success("Welcome, Admin!");
      setTimeout(() => navigate("/admin/dashboard"), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid credentials.");
    } finally { setLoading(false); }
  };

  const inp = { width:"100%", padding:"13px 14px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", fontSize:16, color:"#1e293b", outline:"none", boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#1d4ed8 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        .inp:focus{border-color:#2563eb!important;background:#fff!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 32px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", border:"1.5px solid #dbeafe" }}>

          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:600, color:"#1d4ed8", marginBottom:20 }}>
            🔒 Admin Access Only
          </div>

          <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>Admin Login</h1>
          <p style={{ fontSize:13, color:"#64748b", marginBottom:28 }}>Password verification required on every visit.</p>

          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Admin Email</label>
          <input className="inp" type="email" placeholder="admin@college.edu" value={email}
            onChange={e=>setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off"
            style={{ ...inp, marginBottom:16 }} />

          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
          <div style={{ position:"relative", marginBottom:28 }}>
            <input className="inp" type={showPass?"text":"password"} placeholder="Enter admin password"
              value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              style={{ ...inp, paddingRight:44 }} />
            <button onClick={()=>setShowPass(!showPass)}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>
              {showPass?"🙈":"👁️"}
            </button>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:loading?"#93c5fd":"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.3)", marginBottom:16, fontFamily:"inherit" }}>
            {loading?"Verifying...":"Login as Admin →"}
          </button>

          <div style={{ textAlign:"center" }}>
            <button onClick={()=>navigate("/")}
              style={{ background:"none", border:"none", color:"#94a3b8", fontSize:12, cursor:"pointer" }}>
              ← Student Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}