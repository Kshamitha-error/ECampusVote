import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
  h1:   { fontSize:26, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" },
  h2:   { fontSize:17, fontWeight:700, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" },
  body: { fontSize:14, color:"#64748b", lineHeight:1.6 },
};

const badge = {
  ongoing:   { bg:"#dcfce7", color:"#15803d", label:"🟢 Live Now" },
  upcoming:  { bg:"#fef3c7", color:"#92400e", label:"🕐 Upcoming" },
  ended:     { bg:"#f1f5f9", color:"#64748b", label:"✓ Ended" },
  cancelled: { bg:"#fee2e2", color:"#dc2626", label:"✕ Cancelled" },
};

function ElectionCard({ e }) {
  const navigate = useNavigate();
  const b = badge[e.status] || badge.ended;
  return (
    <div
      onClick={() => navigate(`/elections/${e.id}`)}
      style={{ ...S.card, padding:"18px 20px", cursor:"pointer", transition:"all 0.25s cubic-bezier(.16,1,.3,1)" }}
      onMouseEnter={(el) => { el.currentTarget.style.borderColor="#3b82f6"; el.currentTarget.style.transform="translateY(-3px)"; el.currentTarget.style.boxShadow="0 12px 28px rgba(59,130,246,0.15)"; }}
      onMouseLeave={(el) => { el.currentTarget.style.borderColor="#dbeafe"; el.currentTarget.style.transform="translateY(0)"; el.currentTarget.style.boxShadow="0 2px 12px rgba(59,130,246,0.07)"; }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:10 }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:"#1e3a8a", margin:0, flex:1 }}>{e.title}</h3>
        <span style={{ background:b.bg, color:b.color, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700, flexShrink:0 }}>{b.label}</span>
      </div>
      {e.description && (
        <p style={{ ...S.body, fontSize:13, marginBottom:10, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{e.description}</p>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#94a3b8" }}>
        <span>👥 {e.candidate_count||0} candidates</span>
        {e.status==="ongoing"  && <span style={{ color:"#16a34a", fontWeight:700 }}>Tap to Vote →</span>}
        {e.status==="upcoming" && <span>{new Date(e.start_time).toLocaleString()}</span>}
        {e.status==="ended"    && <span style={{ color:"#2563eb", fontWeight:600 }}>View Results →</span>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ ...S.card, padding:"18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
        <div className="skeleton" style={{ height:18, width:"60%", borderRadius:6 }} />
        <div className="skeleton" style={{ height:18, width:70, borderRadius:99 }} />
      </div>
      <div className="skeleton" style={{ height:13, width:"90%", borderRadius:6, marginBottom:6 }} />
      <div className="skeleton" style={{ height:13, width:"70%", borderRadius:6 }} />
    </div>
  );
}

export default function StudentDashboard() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  

  useEffect(() => {
    API.get("/elections/")
      .then((r) => setElections(r.data))
      .catch(() => toast.error("Failed to load elections."))
      .finally(() => setLoading(false));
  }, []);

  const ongoing  = elections.filter(e => e.status==="ongoing");
  const upcoming = elections.filter(e => e.status==="upcoming");
  const ended    = elections.filter(e => e.status==="ended");

  const stats = [
    { label:"Live Now",    value:ongoing.length,  icon:"🟢", color:"#16a34a", bg:"#dcfce7" },
    { label:"Upcoming",   value:upcoming.length, icon:"🕐", color:"#d97706", bg:"#fef3c7" },
    { label:"Past",       value:ended.length,    icon:"📊", color:"#2563eb", bg:"#eff6ff" },
  ];

  const name = user?.name?.split(" ")[0] || "";

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:28, animation:"fadeUp 0.4s cubic-bezier(.16,1,.3,1)" }}>
          <h1 style={S.h1}>
            {name ? `Welcome back, ${name}! 👋` : "Welcome! 👋"}
          </h1>
          <p style={{ ...S.body, marginTop:6 }}>Your voice matters — check the latest elections below.</p>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:32 }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ ...S.card, padding:"20px 16px", animation:`fadeUp ${0.1+i*0.07}s cubic-bezier(.16,1,.3,1)` }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* Ongoing */}
            {ongoing.length > 0 && (
              <section style={{ marginBottom:32, animation:"fadeUp 0.5s cubic-bezier(.16,1,.3,1)" }}>
                <h2 style={{ ...S.h2, color:"#15803d", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                  🟢 Live Now
                  <span style={{ fontSize:13, fontWeight:500, color:"#16a34a", background:"#dcfce7", padding:"2px 10px", borderRadius:99 }}>Vote before time runs out!</span>
                </h2>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {ongoing.map(e => <ElectionCard key={e.id} e={e} />)}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section style={{ marginBottom:32, animation:"fadeUp 0.55s cubic-bezier(.16,1,.3,1)" }}>
                <h2 style={{ ...S.h2, color:"#d97706", marginBottom:14 }}>🕐 Upcoming Elections</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {upcoming.map(e => <ElectionCard key={e.id} e={e} />)}
                </div>
              </section>
            )}

            {/* Ended */}
            {ended.length > 0 && (
              <section style={{ marginBottom:32, animation:"fadeUp 0.6s cubic-bezier(.16,1,.3,1)" }}>
                <h2 style={{ ...S.h2, color:"#64748b", marginBottom:14 }}>📊 Past Elections</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {ended.map(e => <ElectionCard key={e.id} e={e} />)}
                </div>
              </section>
            )}

            {elections.length === 0 && (
              <div style={{ ...S.card, padding:"60px 20px", textAlign:"center", animation:"fadeUp 0.4s ease" }}>
                <div style={{ fontSize:52, marginBottom:14 }}>🗳️</div>
                <h3 style={{ color:"#1e3a8a", marginBottom:8, fontFamily:"'Space Grotesk',sans-serif" }}>No elections yet</h3>
                <p style={S.body}>Elections will appear here once the admin creates them.</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}