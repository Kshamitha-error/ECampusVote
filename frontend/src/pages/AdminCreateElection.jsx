import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

export default function AdminCreateElection() {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [startTime,   setStartTime]   = useState("");
  const [endTime,     setEndTime]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Create Election — eCampus Vote Admin";
    return () => { document.title = "eCampus Vote"; };
  }, []);

  const duration = startTime && endTime
    ? Math.round((new Date(endTime) - new Date(startTime)) / 60000)
    : null;

  const canSubmit = title.trim() && startTime && endTime && duration > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await API.post("/elections/", {
        title:       title.trim(),
        description: description.trim(),
        start_time:  startTime,
        end_time:    endTime,
      });
      toast.success("Election created! Now add candidates.");
      // Navigate to candidates page — dashboard will refresh when user comes back
      navigate(`/admin/elections/${res.data.election_id}/candidates`, {
        state: { fromCreate: true }
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create election.");
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 10,
    border: "1.5px solid #dbeafe", background: "#f0f7ff",
    fontSize: 16, color: "#1e293b", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit", WebkitAppearance: "none",
  };

  return (
    <Layout>
      <style>{`
        .inp:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important; background: #fff !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ padding: "28px 24px 48px", maxWidth: 640, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          ← Back
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
            Create Election
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Fill in the details. You can add candidates on the next step.
          </p>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 20, padding: "28px", boxShadow: "0 4px 16px rgba(37,99,235,0.08)", animation: "fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>

          {/* Title */}
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Election Title <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            className="inp" type="text"
            placeholder="e.g. NSS President Election 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoCorrect="off" autoComplete="off"
            style={{ ...inp, marginBottom: 20 }}
          />

          {/* Description */}
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Description <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            className="inp"
            placeholder="Brief description about this election..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...inp, resize: "vertical", lineHeight: 1.6, marginBottom: 20 }}
          />

          {/* Date & Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Start Date & Time <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                className="inp" type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                End Date & Time <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                className="inp" type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inp}
              />
            </div>
          </div>

          {/* Duration preview */}
          {duration !== null && duration > 0 && (
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #bbf7d0", marginBottom: 20, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
              ✅ Duration: {duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration} minutes`}
            </div>
          )}
          {duration !== null && duration <= 0 && (
            <div style={{ background: "#fff5f5", borderRadius: 10, padding: "10px 14px", border: "1px solid #fecaca", marginBottom: 20, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              ⚠️ End time must be after start time!
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: canSubmit ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "#e2e8f0",
              color: canSubmit ? "#fff" : "#94a3b8",
              fontWeight: 700, fontSize: 15,
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Creating..." : "Create & Add Candidates →"}
          </button>
        </div>
      </div>
    </Layout>
  );
}