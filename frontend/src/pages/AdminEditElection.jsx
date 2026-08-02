import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

export default function AdminEditElection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [startTime,   setStartTime]   = useState("");
  const [endTime,     setEndTime]     = useState("");
  const [status,      setStatus]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);

  useEffect(() => {
    document.title = "Edit Election — Admin";
    API.get(`/elections/${id}`)
      .then(r => {
        const e = r.data;
        setTitle(e.title || "");
        setDescription(e.description || "");
        // Convert to datetime-local format
        const toLocal = (str) => {
          if (!str) return "";
          const d = new Date(str);
          const pad = n => String(n).padStart(2,"0");
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setStartTime(toLocal(e.start_time));
        setEndTime(toLocal(e.end_time));
        setStatus(e.status);
      })
      .catch(() => toast.error("Failed to load election."))
      .finally(() => setFetching(false));
  }, [id]);

  const duration = startTime && endTime
    ? Math.round((new Date(endTime) - new Date(startTime)) / 60000)
    : null;

  const canSubmit = title.trim() && startTime && endTime && duration > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await API.put(`/elections/${id}`, {
        title:       title.trim(),
        description: description.trim(),
        start_time:  startTime,
        end_time:    endTime,
      });
      toast.success("Election updated!");
      navigate(`/admin/elections/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update election.");
    } finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"13px 14px", borderRadius:10,
    border:"1.5px solid #dbeafe", background:"#f0f7ff",
    fontSize:16, color:"#1e293b", outline:"none",
    boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none",
  };

  const S = { card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:20, boxShadow:"0 4px 16px rgba(37,99,235,0.08)" } };

  if (fetching) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:640, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:28 }}>
            <div className="skeleton" style={{ height:22, width:"60%", borderRadius:8, marginBottom:16 }} />
            <div className="skeleton" style={{ height:14, width:"100%", borderRadius:6, marginBottom:8 }} />
            <div className="skeleton" style={{ height:14, width:"80%", borderRadius:6 }} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        .inp:focus{border-color:#2563eb!important;background:#fff!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ padding:"28px 24px 48px", maxWidth:640, margin:"0 auto" }}>
        <button onClick={() => navigate(-1)}
          style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:20 }}>
          ← Back
        </button>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>
            Edit Election
          </h1>
          {status === "ongoing" && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fef3c7", color:"#92400e", borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, marginTop:8 }}>
              ⚠️ Election is Live — only title and description can be changed
            </div>
          )}
          {status === "ended" && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fee2e2", color:"#dc2626", borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, marginTop:8 }}>
              ✕ Ended elections cannot be edited
            </div>
          )}
        </div>

        <div style={{ ...S.card, padding:28, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>

          {/* Title */}
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
            Election Title <span style={{ color:"#ef4444" }}>*</span>
          </label>
          <input className="inp" type="text"
            placeholder="e.g. NSS President Election 2026"
            value={title} onChange={e => setTitle(e.target.value)}
            disabled={status === "ended"}
            autoCorrect="off" autoComplete="off"
            style={{ ...inp, marginBottom:20, opacity: status==="ended" ? 0.6 : 1 }}
          />

          {/* Description */}
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
            Description
          </label>
          <textarea className="inp"
            placeholder="Brief description about this election..."
            value={description} onChange={e => setDescription(e.target.value)}
            disabled={status === "ended"}
            rows={4}
            style={{ ...inp, resize:"vertical", lineHeight:1.6, marginBottom:20, opacity: status==="ended" ? 0.6 : 1 }}
          />

          {/* Times — only editable for upcoming */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
                Start Time {status !== "upcoming" && <span style={{ fontSize:11, color:"#94a3b8" }}>(locked)</span>}
              </label>
              <input className="inp" type="datetime-local"
                value={startTime} onChange={e => setStartTime(e.target.value)}
                disabled={status !== "upcoming"}
                style={{ ...inp, opacity: status!=="upcoming" ? 0.5 : 1, cursor: status!=="upcoming" ? "not-allowed" : "auto" }}
              />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
                End Time {status !== "upcoming" && <span style={{ fontSize:11, color:"#94a3b8" }}>(locked)</span>}
              </label>
              <input className="inp" type="datetime-local"
                value={endTime} onChange={e => setEndTime(e.target.value)}
                disabled={status !== "upcoming"}
                style={{ ...inp, opacity: status!=="upcoming" ? 0.5 : 1, cursor: status!=="upcoming" ? "not-allowed" : "auto" }}
              />
            </div>
          </div>

          {/* Duration */}
          {duration !== null && duration > 0 && status === "upcoming" && (
            <div style={{ background:"#f0fdf4", borderRadius:10, padding:"10px 14px", border:"1px solid #bbf7d0", marginBottom:20, fontSize:13, color:"#15803d", fontWeight:600 }}>
              ✅ Duration: {duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration} minutes`}
            </div>
          )}
          {duration !== null && duration <= 0 && (
            <div style={{ background:"#fff5f5", borderRadius:10, padding:"10px 14px", border:"1px solid #fecaca", marginBottom:20, fontSize:13, color:"#dc2626" }}>
              ⚠️ End time must be after start time!
            </div>
          )}

          {status !== "ended" && (
            <button onClick={handleSubmit} disabled={loading || !canSubmit}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
                background: canSubmit ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#e2e8f0",
                color: canSubmit ? "#fff" : "#94a3b8",
                fontWeight:700, fontSize:15,
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                fontFamily:"inherit", transition:"all 0.2s",
              }}>
              {loading ? "Saving..." : "Save Changes →"}
            </button>
          )}

          {status === "ended" && (
            <div style={{ textAlign:"center", color:"#94a3b8", fontSize:14 }}>
              Ended elections cannot be modified.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}