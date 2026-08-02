import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const badge = {
  ongoing:   { bg:"#dcfce7", color:"#15803d", label:"🟢 Live" },
  upcoming:  { bg:"#fef3c7", color:"#92400e", label:"🕐 Upcoming" },
  ended:     { bg:"#f1f5f9", color:"#64748b", label:"✓ Ended" },
  cancelled: { bg:"#fee2e2", color:"#dc2626", label:"✕ Cancelled" },
};

const S = {
  card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
};

function SkeletonRow() {
  return (
    <div style={{ ...S.card, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
      <div className="skeleton" style={{ width:48, height:48, borderRadius:12, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ height:15, width:"55%", borderRadius:6, marginBottom:8 }} />
        <div className="skeleton" style={{ height:12, width:"80%", borderRadius:6 }} />
      </div>
      <div className="skeleton" style={{ height:22, width:70, borderRadius:99 }} />
    </div>
  );
}

export default function ElectionsList() {
  const [elections, setElections] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/elections/")
      .then((r) => setElections(r.data))
      .catch(() => toast.error("Failed to load elections."))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key:"all",      label:"All" },
    { key:"ongoing",  label:"🟢 Live" },
    { key:"upcoming", label:"🕐 Upcoming" },
    { key:"ended",    label:"✓ Ended" },
  ];

  const filtered = elections.filter((e) => {
    const matchTab    = filter === "all" || e.status === filter;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const elIcon = (status) => status==="ongoing" ? "🗳️" : status==="upcoming" ? "📅" : "📊";

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>Elections</h1>
          <p style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Browse and participate in college elections.</p>
        </div>

        {/* Search + Tabs */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:24, alignItems:"center" }}>
          <input
            placeholder="🔍 Search elections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex:1, minWidth:180, padding:"10px 14px", borderRadius:10, border:"1.5px solid #dbeafe", background:"#f0f7ff", fontSize:15, color:"#1e293b", outline:"none", fontFamily:"inherit", WebkitAppearance:"none" }}
            onFocus={(e) => { e.target.style.borderColor="#2563eb"; e.target.style.background="#fff"; }}
            onBlur={(e)  => { e.target.style.borderColor="#dbeafe"; e.target.style.background="#f0f7ff"; }}
          />
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                style={{ padding:"8px 16px", borderRadius:99, border:"1.5px solid", borderColor:filter===t.key ? "#2563eb" : "#dbeafe", background:filter===t.key ? "#2563eb" : "#fff", color:filter===t.key ? "#fff" : "#64748b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S.card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗳️</div>
            <p style={{ color:"#64748b", fontSize:14 }}>No elections found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtered.map((e, i) => {
              const b = badge[e.status] || badge.ended;
              return (
                <div key={e.id} onClick={() => navigate(`/elections/${e.id}`)}
                  style={{ ...S.card, padding:"18px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"all 0.25s cubic-bezier(.16,1,.3,1)", animation:`fadeUp ${0.1+i*0.04}s cubic-bezier(.16,1,.3,1)` }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.borderColor="#3b82f6"; ev.currentTarget.style.transform="translateY(-2px)"; ev.currentTarget.style.boxShadow="0 8px 24px rgba(59,130,246,0.15)"; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.borderColor="#dbeafe"; ev.currentTarget.style.transform="translateY(0)"; ev.currentTarget.style.boxShadow="0 2px 12px rgba(59,130,246,0.07)"; }}
                >
                  <div style={{ width:48, height:48, borderRadius:12, background:e.status==="ongoing" ? "#dcfce7" : e.status==="upcoming" ? "#fef3c7" : "#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                    {elIcon(e.status)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:15, color:"#1e3a8a" }}>{e.title}</span>
                      <span style={{ background:b.bg, color:b.color, borderRadius:99, padding:"2px 9px", fontSize:11, fontWeight:700 }}>{b.label}</span>
                    </div>
                    {e.description && (
                      <p style={{ fontSize:13, color:"#64748b", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.description}</p>
                    )}
                    <div style={{ fontSize:12, color:"#94a3b8", marginTop:5 }}>
                      👥 {e.candidate_count||0} candidates
                      {e.status==="ongoing"  && <span style={{ marginLeft:10, color:"#16a34a", fontWeight:600 }}>• Voting open</span>}
                      {e.status==="upcoming" && <span style={{ marginLeft:10 }}>• Starts {new Date(e.start_time).toLocaleString("en-IN")}</span>}
                      {e.status==="ended"    && <span style={{ marginLeft:10, color:"#2563eb", fontWeight:600 }}>• Results available</span>}
                    </div>
                  </div>
                  <span style={{ color:"#94a3b8", fontSize:20, flexShrink:0 }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}