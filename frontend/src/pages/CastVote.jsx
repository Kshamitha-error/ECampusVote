import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { getImageUrl } from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
};

export default function CastVote() {
  const { id } = useParams();
  const [election, setElection]       = useState(null);
  const [selected, setSelected]       = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [votedFor, setVotedFor]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // FIX: fetch both in parallel; don't let check-voted failure kill the whole page
    Promise.all([
      API.get(`/elections/${id}`),
      API.get(`/elections/${id}/check-voted`).catch(() => ({ data: { voted: false } })),
    ])
      .then(([elRes, votedRes]) => {
        setElection(elRes.data);
        if (votedRes.data.voted) {
          setAlreadyVoted(true);
          setVotedFor(votedRes.data.candidate_name);
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "Failed to load election.";
        toast.error(msg);
        console.error("[CastVote load]", err.response?.data || err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleVote = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // FIX: re-fetch fresh election status right before voting
      // so a stale "upcoming" status on the client doesn't block submission
      const freshEl = await API.get(`/elections/${id}`);
      const freshStatus = freshEl.data.status;

      if (freshStatus === "ended" || freshStatus === "cancelled") {
        toast.error("This election is no longer accepting votes.");
        setShowConfirm(false);
        setElection(freshEl.data); // update UI
        return;
      }

      await API.post(`/elections/${id}/vote`, { candidate_id: selected });
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err) {
      // FIX: always show the real backend error message
      const msg = err.response?.data?.error || "Failed to cast vote.";
      toast.error(msg);
      console.error("[CastVote submit]", err.response?.data || err.message);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCandidate = election?.candidates?.find(c => c.id === selected);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div style={{ padding:60, textAlign:"center", color:"#94a3b8" }}>Loading...</div>
      </Layout>
    );
  }

  // ── Already voted ──────────────────────────────────────────────────────────
  if (alreadyVoted) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:500, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"48px 32px", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16, animation:"bounce 1.5s ease-in-out infinite" }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#15803d", marginBottom:10, fontFamily:"'Space Grotesk',sans-serif" }}>Already Voted!</h2>
            <p style={{ fontSize:14, color:"#64748b", marginBottom:8 }}>You have already cast your vote in this election.</p>
            {votedFor && (
              <p style={{ fontSize:15, fontWeight:700, color:"#1e3a8a", marginBottom:28, background:"#eff6ff", padding:"10px 20px", borderRadius:10 }}>
                You voted for: {votedFor}
              </p>
            )}
            <button onClick={() => navigate("/dashboard")}
              style={{ background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:12, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Back to Dashboard
            </button>
          </div>
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </Layout>
    );
  }

  // ── Election not active ────────────────────────────────────────────────────
  // FIX: treat both "upcoming" and anything not "ongoing" as not voteable,
  // but show a clearer message for each case
  if (!election) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:500, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"48px 32px", textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>❓</div>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#1e3a8a", fontFamily:"'Space Grotesk',sans-serif" }}>Election not found</h2>
            <button onClick={() => navigate("/elections")}
              style={{ marginTop:20, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:12, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              View Elections
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (election.status !== "ongoing") {
    const icon    = election.status === "ended"     ? "📊"
                  : election.status === "cancelled"  ? "✕"
                  : "⏳";
    const message = election.status === "ended"     ? "This election has ended. Check the results!"
                  : election.status === "cancelled"  ? "This election was cancelled."
                  : "This election hasn't started yet. Check back later.";
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:500, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"48px 32px", textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>{icon}</div>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#1e3a8a", fontFamily:"'Space Grotesk',sans-serif" }}>Voting not available</h2>
            <p style={{ color:"#64748b", margin:"10px 0 24px" }}>{message}</p>
            <button onClick={() => navigate("/elections")}
              style={{ background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:12, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              View Elections
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:500, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"48px 32px", textAlign:"center" }}>
            <div style={{ fontSize:72, marginBottom:16, animation:"pop 0.8s ease-in-out" }}>🎉</div>
            <h2 style={{ fontSize:24, fontWeight:800, color:"#15803d", marginBottom:10, fontFamily:"'Space Grotesk',sans-serif" }}>Vote Cast!</h2>
            <p style={{ fontSize:14, color:"#64748b", marginBottom:8 }}>Your vote has been recorded successfully.</p>
            <p style={{ fontSize:13, color:"#94a3b8" }}>Redirecting to dashboard...</p>
          </div>
        </div>
        <style>{`@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
      </Layout>
    );
  }

  // ── Main voting UI ─────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px", maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", animation:"fadeUp 0.3s ease" }}>
            <div style={{ fontSize:48, textAlign:"center", marginBottom:14 }}>🗳️</div>
            <h3 style={{ fontSize:20, fontWeight:800, color:"#1e3a8a", textAlign:"center", marginBottom:8, fontFamily:"'Space Grotesk',sans-serif" }}>Confirm Your Vote</h3>
            <p style={{ fontSize:14, color:"#64748b", textAlign:"center", marginBottom:20 }}>You are voting for:</p>
            <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"14px 16px", textAlign:"center", marginBottom:24 }}>
              <div style={{ fontWeight:800, fontSize:18, color:"#1d4ed8" }}>{selectedCandidate?.name}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>
                {selectedCandidate?.branch}{selectedCandidate?.year && ` • Year ${selectedCandidate.year}`}
              </div>
            </div>
            <p style={{ fontSize:12, color:"#ef4444", textAlign:"center", marginBottom:20 }}>⚠️ This cannot be changed once submitted.</p>
            <div style={{ display:"flex", gap:12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                style={{ flex:1, padding:"12px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", color:"#64748b", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={submitting}
                style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background: submitting ? "#86efac" : "linear-gradient(135deg,#16a34a,#22c55e)", color:"#fff", fontWeight:700, fontSize:14, cursor: submitting ? "not-allowed" : "pointer", fontFamily:"inherit", boxShadow:"0 4px 12px rgba(22,163,74,0.3)" }}>
                {submitting ? "Submitting…" : "✅ Confirm Vote"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:"28px 24px 48px", maxWidth:700, margin:"0 auto" }}>
        <button onClick={() => navigate(-1)}
          style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:20 }}>
          ← Back
        </button>

        {/* Election header */}
        <div style={{ ...S.card, padding:"22px 24px", marginBottom:24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#dcfce7", color:"#15803d", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:700, marginBottom:12 }}>
            🟢 Voting is Open
          </div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>
            {election.title}
          </h1>
          <p style={{ fontSize:13, color:"#64748b", marginTop:6 }}>
            Select one candidate below. You can only vote once — choose carefully!
          </p>
        </div>

        <h2 style={{ fontSize:16, fontWeight:700, color:"#1e3a8a", marginBottom:14, fontFamily:"'Space Grotesk',sans-serif" }}>
          Choose a Candidate
        </h2>

        {/* Candidate list */}
        {(!election.candidates || election.candidates.length === 0) ? (
          <div style={{ ...S.card, padding:"40px", textAlign:"center", color:"#94a3b8" }}>
            No candidates have been added yet.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:28 }}>
            {election.candidates.map((c) => (
              <div key={c.id} onClick={() => setSelected(c.id)}
                style={{ background:"#fff", border:`2px solid ${selected===c.id ? "#2563eb" : "#dbeafe"}`, borderRadius:14, padding:"16px 18px", cursor:"pointer", transition:"all 0.2s", boxShadow: selected===c.id ? "0 4px 16px rgba(37,99,235,0.15)" : "none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>

                  {/* Radio */}
                  <div style={{ width:22, height:22, borderRadius:"50%", border:`2.5px solid ${selected===c.id ? "#2563eb" : "#cbd5e1"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: selected===c.id ? "#2563eb" : "#fff", transition:"all 0.2s" }}>
                    {selected===c.id && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                  </div>

                  {/* Photo */}
                  {c.photo_url ? (
                    <img src={getImageUrl(c.photo_url)} alt={c.name}
                      style={{ width:50, height:50, borderRadius:10, objectFit:"cover", border:"2px solid #dbeafe", flexShrink:0 }} />
                  ) : (
                    <div style={{ width:50, height:50, borderRadius:10, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, flexShrink:0 }}>
                      {c.name[0]}
                    </div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color: selected===c.id ? "#1d4ed8" : "#1e3a8a" }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                      {c.branch}{c.year && ` • Year ${c.year}`}
                    </div>
                    {selected===c.id && c.manifesto && (
                      <div style={{ fontSize:12, color:"#475569", marginTop:8, background:"#f8faff", padding:"8px 10px", borderRadius:8, lineHeight:1.6 }}>
                        📋 {c.manifesto.length > 120 ? c.manifesto.slice(0,120)+"…" : c.manifesto}
                      </div>
                    )}
                  </div>

                  {/* Symbol / Logo */}
                  {(c.logo_url || c.symbol_url) && (
                    <img src={getImageUrl(c.logo_url || c.symbol_url)} alt="symbol"
                      style={{ height:36, width:36, objectFit:"contain", flexShrink:0 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={() => selected && setShowConfirm(true)}
          disabled={!selected}
          style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background: selected ? "linear-gradient(135deg,#16a34a,#22c55e)" : "#e2e8f0", color: selected ? "#fff" : "#94a3b8", fontWeight:700, fontSize:16, cursor: selected ? "pointer" : "not-allowed", boxShadow: selected ? "0 4px 16px rgba(22,163,74,0.3)" : "none", fontFamily:"inherit", transition:"all 0.2s" }}>
          {selected ? "🗳️ Proceed to Confirm Vote" : "Select a candidate to continue"}
        </button>
        <p style={{ textAlign:"center", fontSize:12, color:"#94a3b8", marginTop:10 }}>
          ⚠️ You will be asked to confirm before submitting.
        </p>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}