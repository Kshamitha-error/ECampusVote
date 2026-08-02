import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import toast from "react-hot-toast";

const RULES = [
  { label:"8–12 characters",                   test: p => p.length>=8 && p.length<=12 },
  { label:"One uppercase letter (A–Z)",         test: p => /[A-Z]/.test(p) },
  { label:"One lowercase letter (a–z)",         test: p => /[a-z]/.test(p) },
  { label:"One number (0–9)",                   test: p => /\d/.test(p) },
  { label:"One special character (@$!%*?&_#)",  test: p => /[@$!%*?&_#]/.test(p) },
];

export default function ForgotPassword() {
  const [step,      setStep]      = useState(1);
  const [email,     setEmail]     = useState("");
  const [rollNo,    setRollNo]    = useState("");
  const [studentId, setStudentId] = useState(null);
  const [otp,       setOtp]       = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "eCampus Vote — Forgot Password"; }, []);

  const inp = {
    width:"100%", padding:"13px 14px", borderRadius:10,
    border:"1.5px solid #dbeafe", background:"#f0f7ff",
    fontSize:16, color:"#1e293b", outline:"none",
    boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none",
  };

  // Step 1 — verify identity and send OTP via dedicated forgot-password route
  const handleStep1 = async () => {
    if (!email.trim() || !rollNo.trim())
      return toast.error("Enter email and roll number.");
    setLoading(true);
    try {
      const res = await API.post("/student/auth/forgot-password", {
        email:   email.trim().toLowerCase(),
        roll_no: rollNo.trim().toUpperCase(),
      });
      setStudentId(res.data.student_id);
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid details.");
    } finally { setLoading(false); }
  };

  // Step 2 — verify OTP
  const handleStep2 = async () => {
    if (!otp.trim()) return toast.error("Enter the OTP.");
    if (otp.trim().length !== 6) return toast.error("OTP must be 6 digits.");
    setLoading(true);
    try {
      await API.post("/student/auth/verify-otp", { student_id: studentId, otp: otp.trim() });
      toast.success("OTP verified!");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    } finally { setLoading(false); }
  };

  // Step 3 — reset password
  const handleStep3 = async () => {
    if (password !== confirm) return toast.error("Passwords do not match.");
    const allValid = RULES.every(r => r.test(password));
    if (!allValid) return toast.error("Password doesn't meet the requirements.");
    setLoading(true);
    try {
      await API.post("/student/auth/reset-password", {
        student_id:       studentId,
        password:         password,
        confirm_password: confirm,
      });
      toast.success("Password reset successfully!");
      navigate("/returning-login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset.");
    } finally { setLoading(false); }
  };

  const strength      = RULES.filter(r => r.test(password)).length;
  const strengthColor = strength<=2 ? "#ef4444" : strength<=3 ? "#f59e0b" : strength===4 ? "#3b82f6" : "#16a34a";
  const strengthLabel = ["","Weak","Weak","Fair","Good","Strong"][strength];
  const passwordsMatch = password === confirm && confirm !== "";

  const steps = ["Verify Identity", "Enter OTP", "New Password"];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f6ff 0%,#e8f0fe 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        .inp:focus { border-color:#2563eb!important; background:#fff!important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ width:"100%", maxWidth:440, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 32px", boxShadow:"0 8px 32px rgba(37,99,235,0.12)", border:"1.5px solid #dbeafe" }}>

          {/* Step indicators */}
          <div style={{ display:"flex", alignItems:"center", marginBottom:28 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", flex:i < steps.length-1 ? 1 : "none" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:step>i+1?"#16a34a":step===i+1?"#2563eb":"#e2e8f0", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0, transition:"background 0.3s" }}>
                  {step > i+1 ? "✓" : i+1}
                </div>
                {i < steps.length-1 && (
                  <div style={{ flex:1, height:2, background:step>i+1?"#16a34a":"#e2e8f0", margin:"0 6px", transition:"background 0.3s" }} />
                )}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize:22, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>
            {step===1 ? "Forgot Password" : step===2 ? "Verify OTP" : "New Password"}
          </h2>
          <p style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>
            {step===1 ? "Enter your email and roll number to receive an OTP."
             : step===2 ? "Enter the 6-digit OTP sent to your email."
             : "Set a new strong password for your account."}
          </p>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>College Email</label>
              <input className="inp" type="email" placeholder="yourname@college.edu"
                value={email} onChange={e => setEmail(e.target.value)}
                autoCapitalize="none" autoCorrect="off"
                style={{ ...inp, marginBottom:16 }} />

              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Roll Number</label>
              <input className="inp" type="text" placeholder="e.g. 23UP1A0501"
                value={rollNo} onChange={e => setRollNo(e.target.value.toUpperCase())}
                autoCorrect="off" style={{ ...inp, marginBottom:24, textTransform:"uppercase" }} />

              <button onClick={handleStep1} disabled={loading}
                style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 12px rgba(37,99,235,0.3)" }}>
                {loading ? "Sending OTP..." : "Send OTP →"}
              </button>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Enter OTP</label>
              <input className="inp" type="text" inputMode="numeric" placeholder="6-digit OTP"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                maxLength={6} onKeyDown={e => e.key==="Enter" && handleStep2()}
                style={{ ...inp, fontSize:28, letterSpacing:10, textAlign:"center", marginBottom:8 }} />
              <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20, textAlign:"center" }}>
                Check your college email inbox (and spam folder)
              </div>

              <button onClick={handleStep2} disabled={loading || otp.length < 6}
                style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:otp.length===6?"linear-gradient(135deg,#1d4ed8,#2563eb)":"#e2e8f0", color:otp.length===6?"#fff":"#94a3b8", fontWeight:700, fontSize:15, cursor:otp.length===6?"pointer":"not-allowed", fontFamily:"inherit", boxShadow:otp.length===6?"0 4px 12px rgba(37,99,235,0.3)":"none", marginBottom:14 }}>
                {loading ? "Verifying..." : "Verify OTP →"}
              </button>

              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:13, color:"#94a3b8" }}>Didn't receive it? </span>
                <button onClick={handleStep1} disabled={loading}
                  style={{ background:"none", border:"none", color:"#2563eb", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>New Password</label>
              <div style={{ position:"relative", marginBottom:8 }}>
                <input className="inp" type={showPass?"text":"password"}
                  placeholder="Create a strong password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...inp, paddingRight:44 }} />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16 }}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex:1, height:4, borderRadius:99, background:i<=strength?strengthColor:"#e2e8f0", transition:"background 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ fontSize:12, color:strengthColor, fontWeight:600 }}>{strengthLabel}</div>
                </div>
              )}

              {/* Rules */}
              {password && (
                <div style={{ background:"#f8faff", borderRadius:10, padding:"10px 14px", marginBottom:14, border:"1px solid #dbeafe" }}>
                  {RULES.map((rule, i) => {
                    const ok = rule.test(password);
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:ok?"#16a34a":"#94a3b8", marginBottom:i<RULES.length-1?4:0 }}>
                        <span>{ok ? "✅" : "⭕"}</span>{rule.label}
                      </div>
                    );
                  })}
                </div>
              )}

              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Confirm Password</label>
              <input className="inp" type="password" placeholder="Repeat new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key==="Enter" && handleStep3()}
                style={{ ...inp, marginBottom:4, borderColor:confirm?(passwordsMatch?"#16a34a":"#ef4444"):"#dbeafe" }} />
              {confirm && !passwordsMatch && (
                <p style={{ fontSize:12, color:"#ef4444", marginBottom:16 }}>Passwords do not match</p>
              )}
              <div style={{ marginBottom: confirm && !passwordsMatch ? 0 : 16 }} />

              <button onClick={handleStep3} disabled={loading || !passwordsMatch || !RULES.every(r=>r.test(password))}
                style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:passwordsMatch&&RULES.every(r=>r.test(password))?"linear-gradient(135deg,#16a34a,#22c55e)":"#e2e8f0", color:passwordsMatch&&RULES.every(r=>r.test(password))?"#fff":"#94a3b8", fontWeight:700, fontSize:15, cursor:passwordsMatch&&RULES.every(r=>r.test(password))?"pointer":"not-allowed", fontFamily:"inherit" }}>
                {loading ? "Resetting..." : "Reset Password →"}
              </button>
            </>
          )}

          <div style={{ textAlign:"center", marginTop:20 }}>
            <button onClick={() => navigate("/returning-login")}
              style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer" }}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}