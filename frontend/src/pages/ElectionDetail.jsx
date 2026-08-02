import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { getImageUrl } from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: {
    background: "#fff", border: "1.5px solid #dbeafe",
    borderRadius: 16, boxShadow: "0 2px 12px rgba(59,130,246,0.07)"
  },
};

const badge = {
  ongoing:   { bg: "#dcfce7", color: "#15803d", label: "🟢 Live Now" },
  upcoming:  { bg: "#fef3c7", color: "#92400e", label: "🕐 Upcoming" },
  ended:     { bg: "#f1f5f9", color: "#64748b", label: "✓ Ended" },
  cancelled: { bg: "#fee2e2", color: "#dc2626", label: "✕ Cancelled" },
};

export default function ElectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results,  setResults]  = useState(null);
  const [voted,    setVoted]    = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const elRes = await API.get(`/elections/${id}`);
        const el = elRes.data;
        setElection(el);

        if (el.status === "ongoing") {
          try {
            const vRes = await API.get(`/elections/${id}/check-voted`);
            if (vRes.data.voted) {
              setVoted(true);
              setVotedFor(vRes.data.candidate_name);
            }
          } catch {}
        }

        if (el.status === "ended") {
          try {
            const rRes = await API.get(`/elections/${id}/results`);
            setResults(rRes.data.results);
          } catch {}
        }
      } catch {
        toast.error("Failed to load election.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) return (
    <Layout>
      <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
    </Layout>
  );

  if (!election) return (
    <Layout>
      <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Election not found.</div>
    </Layout>
  );

  const b = badge[election.status] || badge.ended;
  const maxVotes = results?.[0]?.votes || 1;

  return (
    <Layout>
      <div style={{ padding: "28px 24px 48px", maxWidth: 700, margin: "0 auto" }}>

        <button onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          ← Back
        </button>

        {/* Header */}
        <div style={{ ...S.card, padding: "24px", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: b.bg, color: b.color, borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
            {b.label}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
            {election.title}
          </h1>
          {election.description && (
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>{election.description}</p>
          )}
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
            🕐 {new Date(election.start_time).toLocaleString("en-IN")} — {new Date(election.end_time).toLocaleString("en-IN")}
          </div>
        </div>

        {/* ONGOING */}
        {election.status === "ongoing" && (
          <div style={{ marginBottom: 24 }}>
            {voted ? (
              <div style={{ ...S.card, padding: "24px", textAlign: "center", background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#15803d", fontSize: 16 }}>You already voted!</div>
                {votedFor && <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Your vote: <strong>{votedFor}</strong></div>}
              </div>
            ) : (
              <button onClick={() => navigate(`/elections/${id}/vote`)}
                style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 16px rgba(22,163,74,0.3)", fontFamily: "inherit" }}>
                🗳️ Cast Your Vote Now
              </button>
            )}
          </div>
        )}

        {/* CANDIDATES — show for upcoming and ongoing */}
        {(election.status === "upcoming" || election.status === "ongoing") && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 14, fontFamily: "'Space Grotesk',sans-serif" }}>
              Candidates ({election.candidates?.length || 0})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {election.candidates?.length === 0 && (
                <div style={{ ...S.card, padding: "32px", textAlign: "center", color: "#94a3b8" }}>
                  No candidates added yet.
                </div>
              )}
              {election.candidates?.map((c) => (
                <div key={c.id}
                  onClick={() => navigate(`/candidates/${c.id}`)}
                  style={{ ...S.card, padding: "16px 18px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {c.photo_url ? (
                      <img src={getImageUrl(c.photo_url)} alt={c.name}
                        style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover", border: "2px solid #dbeafe", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 54, height: 54, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                        {c.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1e3a8a" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {c.branch}{c.year && ` • ${c.year}`}
                      </div>
                      {c.manifesto && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 1.5 }}>
                          {c.manifesto.length > 100 ? c.manifesto.slice(0, 100) + "..." : c.manifesto}
                        </div>
                      )}
                    </div>
                    {(c.symbol_url || c.logo_url) && (
                      <img src={getImageUrl(c.symbol_url || c.logo_url)} alt="symbol"
                        style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* RESULTS — show for ended */}
        {election.status === "ended" && results && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 14, fontFamily: "'Space Grotesk',sans-serif" }}>
              📊 Results
            </h2>

            {results[0] && (
              <div style={{ ...S.card, padding: "20px 24px", marginBottom: 16, background: "linear-gradient(135deg,#fefce8,#fef9c3)", border: "1.5px solid #fde047", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#854d0e" }}>{results[0].name}</div>
                <div style={{ fontSize: 13, color: "#92400e", marginTop: 2 }}>{results[0].votes} votes — Winner</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r, i) => (
                <div key={r.candidate_id} style={{ ...S.card, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#fde047" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: i === 0 ? "#854d0e" : "#1d4ed8", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    {r.photo_url ? (
                      <img src={getImageUrl(r.photo_url)} alt={r.name}
                        style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "2px solid #dbeafe", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {r.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{r.branch}{r.year && ` • ${r.year}`}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#1d4ed8", fontSize: 15 }}>{r.votes} votes</div>
                  </div>
                  <div style={{ height: 6, background: "#e0eaff", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.votes / maxVotes) * 100}%`, background: i === 0 ? "linear-gradient(90deg,#f59e0b,#fde047)" : "linear-gradient(90deg,#2563eb,#60a5fa)", borderRadius: 99, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CANCELLED */}
        {election.status === "cancelled" && (
          <div style={{ ...S.card, padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✕</div>
            <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 16 }}>This election was cancelled.</div>
          </div>
        )}

      </div>
    </Layout>
  );
}