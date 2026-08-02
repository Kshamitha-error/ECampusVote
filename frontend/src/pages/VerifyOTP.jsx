import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../utils/api";
import toast from "react-hot-toast";

export default function VerifyOTP() {
  const [otp, setOtp] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(120); // 2 minutes
  const [expired, setExpired] = useState(false);
  const refs = useRef([]);
  const navigate = useNavigate();
  const { state } = useLocation();
  const studentId = state?.student_id;

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) { setExpired(true); return; }
    const t = setInterval(() => setTimer(p => { if (p <= 1) { setExpired(true); clearInterval(t); return 0; } return p-1; }), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) refs.current[i+1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key==="Backspace" && !otp[i] && i>0) refs.current[i-1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (text.length===6) { setOtp(text.split("")); refs.current[5]?.focus(); }
  };

  const handleSubmit = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter all 6 digits.");
    setLoading(true);
    try {
      const res = await API.post("/student/auth/verify-otp", { student_id:studentId, otp:code });
      toast.success("OTP verified!");
      navigate("/set-password", { state:{ student_id:res.data.student_id } });
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await API.post("/student/auth/resend-otp", { student_id:studentId });
      toast.success("New OTP sent!");
      setOtp(["","","","","",""]); setTimer(120); setExpired(false);
      refs.current[0]?.focus();
    } catch { toast.error("Failed to resend."); }
    finally { setResending(false); }
  };

  const filled = otp.join("").length;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f6ff 0%,#e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 32px", boxShadow:"0 8px 32px rgba(37,99,235,0.12)", border:"1.5px solid #dbeafe" }}>

          {/* Icon */}
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:20, boxShadow:"0 4px 16px rgba(37,99,235,0.3)" }}>
            📧
          </div>

          <h1 style={{ fontSize:22, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>Check your email</h1>
          <p style={{ fontSize:14, color:"#64748b", marginBottom:10, lineHeight:1.6 }}>
            We sent a 6-digit OTP to your registered email.
          </p>

          {/* Timer */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:expired ? "#fee2e2" : timer < 60 ? "#fff7ed" : "#eff6ff", borderRadius:99, padding:"5px 12px", fontSize:13, fontWeight:700, color:expired ? "#dc2626" : timer < 60 ? "#d97706" : "#2563eb", marginBottom:24, border:`1px solid ${expired ? "#fecaca" : timer < 60 ? "#fed7aa" : "#bfdbfe"}` }}>
            ⏱ {expired ? "OTP Expired" : `Expires in ${formatTime(timer)}`}
          </div>

          {/* OTP boxes */}
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:24 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input key={i} ref={el => refs.current[i]=el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{ width:48, height:56, textAlign:"center", fontSize:24, fontWeight:700, border:`2px solid ${digit ? "#2563eb" : "#dbeafe"}`, borderRadius:12, background:digit ? "#eff6ff" : "#f8faff", color:"#1e3a8a", outline:"none", transition:"all 0.15s", fontFamily:"'Space Grotesk',sans-serif" }}
                onFocus={(e) => e.target.style.borderColor="#2563eb"}
                onBlur={(e)  => e.target.style.borderColor=digit ? "#2563eb" : "#dbeafe"}
              />
            ))}
          </div>

          {/* Verify button */}
          <button onClick={handleSubmit} disabled={loading || filled<6 || expired}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:filled===6 && !expired ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#e2e8f0", color:filled===6 && !expired ? "#fff" : "#94a3b8", fontWeight:700, fontSize:15, cursor:filled===6 && !expired ? "pointer" : "not-allowed", marginBottom:16, boxShadow:filled===6 && !expired ? "0 4px 12px rgba(37,99,235,0.3)" : "none", transition:"all 0.2s", fontFamily:"inherit" }}>
            {loading ? "Verifying..." : "Verify OTP →"}
          </button>

          {/* Resend */}
          <div style={{ textAlign:"center" }}>
            <span style={{ fontSize:13, color:"#94a3b8" }}>Didn't receive it? </span>
            <button onClick={handleResend} disabled={resending}
              style={{ background:"none", border:"none", color:"#2563eb", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </div>

        {/* Back */}
        <div style={{ textAlign:"center", marginTop:18 }}>
          <button onClick={() => navigate("/")} style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer" }}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}