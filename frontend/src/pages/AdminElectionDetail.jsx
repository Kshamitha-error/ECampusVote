import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: { background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 16, boxShadow: "0 2px 12px rgba(59,130,246,0.07)" },
};

const statusMap = {
  ongoing:   { bg: "#dcfce7", color: "#15803d", label: "🟢 Live Now" },
  upcoming:  { bg: "#fef3c7", color: "#92400e", label: "🕐 Upcoming" },
  ended:     { bg: "#f1f5f9", color: "#64748b", label: "✓ Ended" },
  cancelled: { bg: "#fee2e2", color: "#dc2626", label: "✕ Cancelled" },
};

export default function AdminElectionDetail() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [turnout, setTurnout] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    API.get(`/elections/${id}`)
      .then((r) => {
        setElection(r.data);
        document.title = `${r.data.title} — Admin`;
      })
      .catch(() => toast.error("Failed to load election."))
      .finally(() => setLoading(false));

    API.get(`/elections/${id}/turnout`)
      .then((r) => setTurnout(r.data))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    return () => { document.title = "eCampus Vote — Admin"; };
  }, [load]);

  const doAction = async (action) => {
    if (action === "cancel" && !window.confirm("Cancel this election?")) return;
    if (action === "end"    && !window.confirm("End this election now?")) return;

    try {
      if (action === "start") {
        await API.post(`/elections/${id}/start`);
      } else if (action === "end") {
        // FIX: POST to /end (backend accepts POST or PATCH)
        await API.post(`/elections/${id}/end`);
      } else if (action === "cancel") {
        await API.post(`/elections/${id}/cancel`);
      }
      toast.success(`Election ${action}ed!`);
      load();
    } catch (err) {
      // FIX: always show real error, never suppress
      const msg = err.response?.data?.error || `Failed to ${action} election.`;
      toast.error(msg);
      console.error(`[AdminDetail:${action}]`, err.response?.data || err.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "28px 24px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ ...S.card, padding: "24px 26px", marginBottom: 16 }}>
            <div className="skeleton" style={{ height: 22, width: "60%", borderRadius: 8, marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!election) {
    return (
      <Layout>
        <div style={{ padding: "28px 24px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ ...S.card, padding: "60px 20px", textAlign: "center" }}>
            <p style={{ color: "#64748b" }}>Election not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const b = statusMap[election.status] || statusMap.ended;
  const results = turnout?.results || [];
  const maxVotes = results.length ? Math.max(...results.map(r => r.votes), 1) : 1;

  return (
    <Layout>
      <div style={{ padding: "28px 24px 48px", maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate("/admin/elections")}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          ← Back to Elections
        </button>

        {/* Election info */}
        <div style={{ ...S.card, padding: "24px 26px", marginBottom: 20, animation: "fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif", flex: 1 }}>
              {election.title}
            </h1>
            <span style={{ background: b.bg, color: b.color, borderRadius: 99, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>
              {b.label}
            </span>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Start",      value: new Date(election.start_time).toLocaleString("en-IN") },
              { label: "End",        value: new Date(election.end_time).toLocaleString("en-IN") },
              { label: "Candidates", value: election.candidates?.length || 0 },
              { label: "Votes Cast", value: turnout?.votes_cast ?? "—" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#f8faff", borderRadius: 10, padding: "10px 14px", border: "1px solid #e8f0fe" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", fontFamily: "'Space Grotesk',sans-serif" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Turnout bar */}
          {turnout && (
            <div style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8f0fe", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Voter Turnout</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2563eb", fontFamily: "'Space Grotesk',sans-serif" }}>
                  {turnout.turnout_percentage}%
                </span>
              </div>
              <div style={{ background: "#dbeafe", borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(90deg,#1d4ed8,#3b82f6)", height: "100%", width: `${Math.min(turnout.turnout_percentage,100)}%`, borderRadius: 99, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {turnout.votes_cast} of {turnout.total_registered_students} registered students voted
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => navigate(`/admin/elections/${id}/candidates`)}
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              👤 Manage Candidates
            </button>
            {(election.status==="upcoming"||election.status==="ongoing") && (
              <button onClick={() => navigate(`/admin/elections/${id}/edit`)}
                style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#2563eb", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                ✏️ Edit Election
              </button>
            )}
            {election.status === "upcoming" && (
              <button onClick={() => doAction("start")}
                style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ▶ Start Election
              </button>
            )}
            {election.status === "ongoing" && (
              <button onClick={() => doAction("end")}
                style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ■ End Election
              </button>
            )}
            {(election.status === "upcoming" || election.status === "ongoing") && (
              <button onClick={() => doAction("cancel")}
                style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#d97706", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✕ Cancel
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ ...S.card, padding: "22px 24px", animation: "fadeUp 0.5s cubic-bezier(.16,1,.3,1)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e3a8a", marginBottom: 16, fontFamily: "'Space Grotesk',sans-serif" }}>
              {election.status === "ended" ? "🏆 Final Results" : "📊 Live Vote Count"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r, i) => (
                <div key={r.candidate_id}
                  style={{ background: i===0 && election.status==="ended" ? "#f0fdf4" : "#f8faff", border: `1.5px solid ${i===0 && election.status==="ended" ? "#bbf7d0" : "#e8f0fe"}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {i===0 && election.status==="ended" && <span style={{ fontSize: 18 }}>🏆</span>}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a" }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{r.branch}{r.year && ` • Year ${r.year}`}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: i===0 ? "#16a34a" : "#2563eb", fontFamily: "'Space Grotesk',sans-serif" }}>{r.votes}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {turnout?.total_registered_students
                          ? `${Math.round((r.votes/turnout.total_registered_students)*100)}%`
                          : "votes"}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "#dbeafe", borderRadius: 99, height: 6, overflow: "hidden" }}>
                    <div style={{ background: i===0 ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#1d4ed8,#3b82f6)", height: "100%", width: `${maxVotes>0 ? (r.votes/maxVotes)*100 : 0}%`, borderRadius: 99, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && election.status !== "upcoming" && (
          <div style={{ ...S.card, padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>No votes cast yet.</p>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}