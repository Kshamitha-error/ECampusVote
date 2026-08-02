import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import toast from "react-hot-toast";

const QA = [
  { icon:"🗳️", q:"Why Digital Voting?", a:"No paper, no queues. Cast your vote instantly from your phone in seconds." },
  { icon:"📊", q:"Why Transparent?",    a:"Results are calculated automatically — no human interference, no bias." },
  { icon:"🔐", q:"Why Secure?",         a:"OTP verification ensures only registered students can vote. One student, one vote." },
  { icon:"⚡", q:"Why Better Than Manual?", a:"Instant results, zero counting errors, full digital record of every election." },
];

function LogoBranding({ white }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        {!err ? (
          <img src="/logo.png" alt="eCampus Vote" onError={() => setErr(true)}
            style={{ height:48, objectFit:"contain", filter:white?"brightness(0) invert(1)":"none" }} />
        ) : (
          <div style={{ width:48, height:48, borderRadius:12, background:white?"rgba(255,255,255,0.2)":"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🗳️</div>
        )}
        <div>
          <div style={{ fontWeight:800, fontSize:22, color:white?"#fff":"#1e3a8a", fontFamily:"'Space Grotesk',sans-serif" }}>eCampus Vote</div>
          <div style={{ fontSize:12, color:white?"#93c5fd":"#64748b" }}>Your Vote. Your Voice.</div>
        </div>
      </div>
    </div>
  );
}

function sanitize(str) {
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

export default function StudentLogin() {
  const [email,   setEmail]   = useState("");
  const [rollNo,  setRollNo]  = useState("");
  const [loading, setLoading] = useState(false);
  const [mobile,  setMobile]  = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "eCampus Vote — Login";
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const handleSubmit = async () => {
    const cleanEmail  = sanitize(email).toLowerCase();
    const cleanRollNo = sanitize(rollNo).toUpperCase();

    if (!cleanEmail || !cleanRollNo)
      return toast.error("Please enter both email and roll number.");
    if (!cleanEmail.includes("@") || !cleanEmail.includes("."))
      return toast.error("Please enter a valid email address.");

    setLoading(true);
    try {
      const res = await API.post("/student/auth/verify-identity", {
        email:   cleanEmail,
        roll_no: cleanRollNo,
      });

      if (res.data.error === "already_registered") {
        toast.error("You're already registered! Please sign in with your password.");
        navigate("/returning-login");
        return;
      }

      toast.success("OTP sent to your email!");
      navigate("/verify-otp", { state: { student_id: res.data.student_id } });
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid details. Check your email and roll number.");
    } finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"13px 14px", borderRadius:10,
    border:"1.5px solid #dbeafe", background:"#f0f7ff",
    fontSize:16, color:"#1e293b", outline:"none",
    boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none",
  };

  const InfoPanel = (
    <div style={{ background:"linear-gradient(160deg,#1e3a8a 0%,#1d4ed8 60%,#2563eb 100%)", padding:mobile?"28px 20px":"48px 40px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <LogoBranding white={true} />
      <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr 1fr":"1fr", gap:10 }}>
        {QA.map((item,i) => (
          <div key={i} style={{ background:"rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", border:"1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{item.icon}</div>
            <div style={{ fontWeight:700, color:"#fff", fontSize:12, marginBottom:3 }}>{item.q}</div>
            <div style={{ color:"#bfdbfe", fontSize:11, lineHeight:1.5 }}>{item.a}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:20, marginTop:20 }}>
        {[["100%","Secure"],["Zero","Paper"],["Instant","Results"]].map(([v,l]) => (
          <div key={l}>
            <div style={{ fontWeight:800, fontSize:14, color:"#fff" }}>{v}</div>
            <div style={{ fontSize:11, color:"#93c5fd" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const FormPanel = (
    <div style={{ background:"#fff", padding:mobile?"28px 20px 40px":"48px 40px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:"#1e3a8a", marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>Student Login</h2>
      <p style={{ fontSize:13, color:"#64748b", marginBottom:28 }}>Enter your college email and roll number to get started.</p>

      <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>College Email</label>
      <input
        type="text"
        placeholder="yourname@college.edu"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="new-password"
        spellCheck="false"
        inputMode="email"
        onFocus={e=>{e.target.style.borderColor="#2563eb";e.target.style.background="#fff";}}
        onBlur={e=>{e.target.style.borderColor="#dbeafe";e.target.style.background="#f0f7ff";}}
        style={{ ...inp, marginBottom:16 }}
      />

      <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Roll Number</label>
      <input
        type="text"
        placeholder="e.g. 23UP1A0501"
        value={rollNo}
        onChange={e => setRollNo(e.target.value.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="new-password"
        spellCheck="false"
        inputMode="text"
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        onFocus={e=>{e.target.style.borderColor="#2563eb";e.target.style.background="#fff";}}
        onBlur={e=>{e.target.style.borderColor="#dbeafe";e.target.style.background="#f0f7ff";}}
        style={{ ...inp, marginBottom:8, textTransform:"uppercase" }}
      />
      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:20 }}>Roll number is automatically converted to uppercase</div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:loading?"#93c5fd":"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer", marginBottom:18, boxShadow:"0 4px 12px rgba(37,99,235,0.3)", fontFamily:"inherit" }}>
        {loading ? "Verifying..." : "Verify & Send OTP →"}
      </button>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
        <span style={{ fontSize:12, color:"#9ca3af" }}>already registered?</span>
        <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
      </div>

      <button onClick={() => navigate("/returning-login")}
        style={{ width:"100%", padding:"13px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", color:"#1d4ed8", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:12, fontFamily:"inherit" }}>
        Sign In with Password
      </button>

      <div style={{ textAlign:"center" }}>
        <span onClick={() => navigate("/admin/login")} style={{ fontSize:12, color:"#94a3b8", cursor:"pointer" }}>Admin Login →</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`*{box-sizing:border-box;}body{margin:0;}`}</style>
      {mobile ? (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          {InfoPanel}
          {FormPanel}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:"100vh" }}>
          {InfoPanel}
          {FormPanel}
        </div>
      )}
    </>
  );
}