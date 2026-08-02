import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { getImageUrl } from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
  label: { fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6, display:"block" },
};

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get(`/elections/candidates/${id}`)
      .then((r) => setCandidate(r.data))
      .catch(() => toast.error("Failed to load candidate."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:700, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"32px", marginBottom:16 }}>
            <div style={{ display:"flex", gap:20, marginBottom:20 }}>
              <div className="skeleton" style={{ width:90, height:90, borderRadius:16, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div className="skeleton" style={{ height:22, width:"60%", borderRadius:8, marginBottom:10 }} />
                <div className="skeleton" style={{ height:14, width:"40%", borderRadius:6 }} />
              </div>
            </div>
          </div>
          <div style={{ ...S.card, padding:"24px", marginBottom:12 }}>
            <div className="skeleton" style={{ height:14, width:"30%", borderRadius:6, marginBottom:12 }} />
            <div className="skeleton" style={{ height:12, width:"100%", borderRadius:6, marginBottom:8 }} />
            <div className="skeleton" style={{ height:12, width:"85%", borderRadius:6 }} />
          </div>
        </div>
      </Layout>
    );
  }

  if (!candidate) {
    return (
      <Layout>
        <div style={{ padding:"28px 24px", maxWidth:700, margin:"0 auto" }}>
          <div style={{ ...S.card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>😕</div>
            <p style={{ color:"#64748b" }}>Candidate not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:700, margin:"0 auto" }}>

        <button onClick={() => navigate(-1)} style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:20, display:"flex", alignItems:"center", gap:4 }}>
          ← Back
        </button>

        {/* Profile card */}
        <div style={{ ...S.card, padding:"28px 28px", marginBottom:16, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap", marginBottom:20 }}>
            {candidate.photo_url ? (
              <img src={getImageUrl(candidate.photo_url)} alt={candidate.name}
                style={{ width:90, height:90, borderRadius:16, objectFit:"cover", border:"3px solid #dbeafe", boxShadow:"0 4px 12px rgba(37,99,235,0.15)", flexShrink:0 }} />
            ) : (
              <div style={{ width:90, height:90, borderRadius:16, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:36, boxShadow:"0 4px 12px rgba(37,99,235,0.3)", flexShrink:0 }}>
                {candidate.name[0]}
              </div>
            )}
            <div style={{ flex:1 }}>
              <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:"0 0 6px", fontFamily:"'Space Grotesk',sans-serif" }}>{candidate.name}</h1>
              {candidate.logo_url && (
                <img src={getImageUrl(candidate.logo_url)} alt="Symbol" style={{ height:36, marginBottom:10, objectFit:"contain" }} />
              )}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {candidate.branch && (
                  <span style={{ background:"#eff6ff", color:"#2563eb", borderRadius:99, padding:"4px 12px", fontSize:13, fontWeight:600, border:"1px solid #bfdbfe" }}>
                    📚 {candidate.branch}
                  </span>
                )}
                {candidate.year && (
                  <span style={{ background:"#eff6ff", color:"#2563eb", borderRadius:99, padding:"4px 12px", fontSize:13, fontWeight:600, border:"1px solid #bfdbfe" }}>
                    🎓 Year {candidate.year}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manifesto */}
        {candidate.manifesto && (
          <div style={{ ...S.card, padding:"22px 24px", marginBottom:14, animation:"fadeUp 0.5s cubic-bezier(.16,1,.3,1)" }}>
            <span style={S.label}>📋 Manifesto</span>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.8, margin:0 }}>{candidate.manifesto}</p>
          </div>
        )}

        {/* Achievements */}
        {candidate.achievements && (
          <div style={{ ...S.card, padding:"22px 24px", animation:"fadeUp 0.55s cubic-bezier(.16,1,.3,1)" }}>
            <span style={S.label}>🏆 Achievements</span>
            <p style={{ fontSize:14, color:"#475569", lineHeight:1.8, margin:0 }}>{candidate.achievements}</p>
          </div>
        )}

        {!candidate.manifesto && !candidate.achievements && (
          <div style={{ ...S.card, padding:"32px 20px", textAlign:"center" }}>
            <p style={{ color:"#94a3b8", fontSize:14 }}>No additional details available for this candidate.</p>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}