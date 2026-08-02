import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: { background:"#fff", border:"1.5px solid #dbeafe", borderRadius:16, boxShadow:"0 2px 12px rgba(59,130,246,0.07)" },
  h1:   { fontSize:24, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" },
};

const statusMap = {
  ongoing:   { bg:"#dcfce7", color:"#15803d", label:"🟢 Live" },
  upcoming:  { bg:"#fef3c7", color:"#92400e", label:"🕐 Upcoming" },
  ended:     { bg:"#f1f5f9", color:"#64748b", label:"✓ Ended" },
  cancelled: { bg:"#fee2e2", color:"#dc2626", label:"✕ Cancelled" },
};

function SkeletonRow() {
  return (
    <div style={{ padding:"18px 22px", borderBottom:"1px solid #f0f4ff", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ height:15, width:"50%", borderRadius:6, marginBottom:8 }} />
        <div className="skeleton" style={{ height:11, width:"30%", borderRadius:6 }} />
      </div>
      <div className="skeleton" style={{ height:22, width:70, borderRadius:99 }} />
      <div style={{ display:"flex", gap:6 }}>
        <div className="skeleton" style={{ height:30, width:55, borderRadius:8 }} />
        <div className="skeleton" style={{ height:30, width:55, borderRadius:8 }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const load = () => {
    setLoading(true);
    API.get("/elections/")
      .then((r) => setElections(r.data))
      .catch(() => toast.error("Failed to load."))
      .finally(() => setLoading(false));
  };

  // Reload on mount
  useEffect(() => { load(); }, []);

  // Reload when navigated back here (e.g. after creating an election)
  useEffect(() => {
    if (location.state?.refresh) {
      load();
      // Clear the state so it doesn't reload again on unrelated re-renders
      window.history.replaceState({}, "");
    }
  }, [location.state?.refresh]);

  // Reload when window gets focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const doAction = async (eid, action) => {
    if (action === "cancel" && !window.confirm("Cancel this election?")) return;
    try {
      await API.post(`/elections/${eid}/${action}`);
      toast.success(`Election ${action}ed!`);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "Action failed.";
      if (!msg.toLowerCase().includes("admin")) toast.error(msg);
    }
  };

  const stats = [
    { label:"Total",    value:elections.length,                        icon:"🗳️", color:"#2563eb", bg:"#eff6ff" },
    { label:"Live Now", value:elections.filter(e=>e.status==="ongoing").length,  icon:"🟢", color:"#16a34a", bg:"#dcfce7" },
    { label:"Upcoming", value:elections.filter(e=>e.status==="upcoming").length, icon:"🕐", color:"#d97706", bg:"#fef3c7" },
    { label:"Ended",    value:elections.filter(e=>e.status==="ended").length,    icon:"✓",  color:"#64748b", bg:"#f1f5f9" },
  ];

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <div>
            <h1 style={S.h1}>Admin Dashboard</h1>
            <p style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Manage elections and monitor voter turnout.</p>
          </div>
          <button onClick={() => navigate("/admin/elections/create")}
            style={{ background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:12, padding:"11px 22px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.3)", fontFamily:"inherit" }}>
            + New Election
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ ...S.card, padding:"20px 16px", animation:`fadeUp ${0.1+i*0.06}s cubic-bezier(.16,1,.3,1)` }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Elections table */}
        <div style={{ ...S.card, overflow:"hidden", marginBottom:24 }}>
          <div style={{ padding:"18px 22px", borderBottom:"1px solid #e8f0fe", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>All Elections</h2>
            <button onClick={() => navigate("/admin/elections")} style={{ background:"none", border:"none", color:"#2563eb", fontSize:13, fontWeight:600, cursor:"pointer" }}>View all →</button>
          </div>

          {loading ? (
            <>{[1,2,3].map(i => <SkeletonRow key={i} />)}</>
          ) : elections.length === 0 ? (
            <div style={{ padding:"50px 20px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🗳️</div>
              <p style={{ color:"#94a3b8", fontSize:14 }}>No elections yet. Create one to get started!</p>
            </div>
          ) : (
            elections.slice(0,8).map((e, i) => {
              const s = statusMap[e.status] || statusMap.ended;
              return (
                <div key={e.id} style={{ padding:"16px 22px", borderBottom:i < elections.length-1 ? "1px solid #f0f4ff" : "none", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", animation:`fadeUp ${0.15+i*0.04}s cubic-bezier(.16,1,.3,1)` }}>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1e3a8a", marginBottom:3 }}>{e.title}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>
                      {new Date(e.start_time).toLocaleDateString("en-IN")} • {e.candidate_count||0} candidates • {e.vote_count||0} votes
                    </div>
                  </div>
                  <span style={{ background:s.bg, color:s.color, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{s.label}</span>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button onClick={() => navigate(`/admin/elections/${e.id}`)} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#2563eb", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>View</button>
                    {e.status==="upcoming"  && <button onClick={() => doAction(e.id,"start")}  style={{ background:"#dcfce7", border:"1px solid #bbf7d0", color:"#16a34a", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>▶ Start</button>}
                    {e.status==="ongoing"   && <button onClick={() => doAction(e.id,"end")}    style={{ background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>■ End</button>}
                    {(e.status==="upcoming"||e.status==="ongoing") && <button onClick={() => doAction(e.id,"cancel")} style={{ background:"#fff7ed", border:"1px solid #fed7aa", color:"#d97706", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>✕</button>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick links */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14 }}>
          {[
            { label:"Manage Students", icon:"👥", path:"/admin/students",         color:"#2563eb" },
            { label:"Create Election",  icon:"➕", path:"/admin/elections/create", color:"#16a34a" },
            { label:"All Elections",    icon:"📋", path:"/admin/elections",        color:"#d97706" },
          ].map((item, i) => (
            <div key={item.label} onClick={() => navigate(item.path)}
              style={{ ...S.card, padding:"20px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.2s", animation:`fadeUp ${0.3+i*0.06}s cubic-bezier(.16,1,.3,1)` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(59,130,246,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor="#dbeafe"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(59,130,246,0.07)"; }}
            >
              <span style={{ fontSize:22 }}>{item.icon}</span>
              <span style={{ fontWeight:600, fontSize:14, color:"#1e3a8a" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}