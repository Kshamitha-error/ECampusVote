import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const inp = {
  width:"100%", padding:"11px 14px", borderRadius:10,
  border:"1.5px solid var(--border,#dbeafe)",
  background:"var(--card-bg,#f0f7ff)",
  fontSize:14, color:"var(--text,#1e293b)",
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};

export default function StudentProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name,            setName]            = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [tab,             setTab]             = useState("info");

  useEffect(() => { document.title = "My Profile — eCampus Vote"; }, []);

  const S = {
    card: { background:"var(--card-bg,#fff)", border:"1.5px solid var(--border,#dbeafe)", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
    tab: (active) => ({
      padding:"9px 18px", borderRadius:10, border:"none",
      background: active ? "#2563eb" : "transparent",
      color: active ? "#fff" : "var(--sub-text,#64748b)",
      fontWeight: active ? 700 : 500,
      fontSize:13, cursor:"pointer", fontFamily:"inherit",
    }),
    btn: {
      width:"100%", padding:"12px", borderRadius:10, border:"none",
      background:"linear-gradient(135deg,#1d4ed8,#2563eb)",
      color:"#fff", fontWeight:700, fontSize:14,
      cursor:"pointer", fontFamily:"inherit",
    },
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty.");
    setLoading(true);
    try {
      const res = await API.put("/student/auth/profile", { name: name.trim() });
      toast.success("Name updated successfully.");
      if (setUser) setUser(res.data.student);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update.");
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error("Enter your current password.");
    if (!newPassword)     return toast.error("Enter a new password.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await API.put("/student/auth/profile", {
        current_password: currentPassword,
        new_password:     newPassword,
        confirm_password: confirmPassword,
      });
      toast.success("Password changed successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change password.");
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:540, margin:"0 auto" }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:20 }}>
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:"0 0 4px", fontFamily:"'Space Grotesk',sans-serif" }}>My Profile</h1>
        <p style={{ fontSize:14, color:"var(--sub-text,#64748b)", marginBottom:24 }}>Manage your account details.</p>

        {/* Avatar card */}
        <div style={{ ...S.card, padding:"20px 24px", marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", flexShrink:0 }}>
            {(user?.name || "S")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"var(--text,#1e3a8a)" }}>{user?.name || "Student"}</div>
            <div style={{ fontSize:13, color:"var(--sub-text,#64748b)" }}>{user?.email}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Roll No: {user?.roll_no || "—"}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ ...S.card, padding:24 }}>
          <div style={{ display:"flex", gap:6, marginBottom:24 }}>
            <button style={S.tab(tab==="info")}     onClick={() => setTab("info")}>Account Info</button>
            <button style={S.tab(tab==="password")} onClick={() => setTab("password")}>Change Password</button>
          </div>

          {tab === "info" && (
            <div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>Full Name</label>
                <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>
                  Email <span style={{ color:"#94a3b8", fontWeight:400 }}>(cannot be changed)</span>
                </label>
                <input style={{ ...inp, opacity:0.6, cursor:"not-allowed" }} value={user?.email || ""} disabled />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>
                  Roll Number <span style={{ color:"#94a3b8", fontWeight:400 }}>(cannot be changed)</span>
                </label>
                <input style={{ ...inp, opacity:0.6, cursor:"not-allowed" }} value={user?.roll_no || ""} disabled />
              </div>
              <button onClick={handleSaveInfo} disabled={loading} style={S.btn}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {tab === "password" && (
            <div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>Current Password</label>
                <input style={inp} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>New Password</label>
                <input style={inp} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"var(--text,#374151)", display:"block", marginBottom:6 }}>Confirm New Password</label>
                <input style={inp} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
              </div>
              <button onClick={handleChangePassword} disabled={loading} style={S.btn}>
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}