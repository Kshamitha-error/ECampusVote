import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function StudentReturningLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = "eCampus Vote — Sign In"; }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return toast.error("Please enter email and password.");
    setLoading(true);
    try {
      const res = await API.post("/student/auth/login", {
        email: email.trim().toLowerCase(), password,
      });
      loginStudent(res.data.access_token, res.data.student);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const inp = { width:"100%", padding:"13px 14px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", fontSize:16, color:"#1e293b", outline:"none", boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f6ff 0%,#e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        .inp:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.12)!important;background:#fff!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 32px", boxShadow:"0 8px 32px rgba(37,99,235,0.12)", border:"1.5px solid #dbeafe" }}>

          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🗳️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:"#1e3a8a", fontFamily:"'Space Grotesk',sans-serif" }}>eCampus Vote</div>
              <div style={{ fontSize:11, color:"#64748b" }}>Welcome back!</div>
            </div>
          </div>

          <h2 style={{ fontSize:22, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>Sign In</h2>
          <p style={{ fontSize:13, color:"#64748b", marginBottom:28 }}>Enter your email and password to continue.</p>

          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>College Email</label>
          <input className="inp" type="email" placeholder="yourname@college.edu" value={email}
            onChange={e=>setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="email"
            style={{ ...inp, marginBottom:16 }} />

          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
          <div style={{ position:"relative", marginBottom:10 }}>
            <input className="inp" type={showPass?"text":"password"} placeholder="Enter your password"
              value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              style={{ ...inp, paddingRight:44 }} />
            <button onClick={()=>setShowPass(!showPass)}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>
              {showPass?"🙈":"👁️"}
            </button>
          </div>

          <div style={{ textAlign:"right", marginBottom:24 }}>
            <button onClick={()=>navigate("/forgot-password")}
              style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Forgot Password?
            </button>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:loading?"#93c5fd":"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.3)", marginBottom:20, fontFamily:"inherit" }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
            <span style={{ fontSize:12, color:"#9ca3af" }}>new here?</span>
            <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
          </div>

          <button onClick={()=>navigate("/")}
            style={{ width:"100%", padding:"12px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", color:"#1d4ed8", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            Register with Email & Roll No
          </button>
        </div>
      </div>
    </div>
  );
}