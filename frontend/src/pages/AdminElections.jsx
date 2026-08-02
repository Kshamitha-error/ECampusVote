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

export default function AdminElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    API.get("/elections/")
      .then((r) => setElections(r.data))
      .catch(() => toast.error("Failed to load elections."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doAction = async (eid, action, title) => {
    const confirmMsg = {
      delete: `Delete "${title}"? This cannot be undone.`,
      cancel: `Cancel "${title}"?`,
      end:    `End "${title}" now?`,
    }[action];
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    try {
      if (action === "delete") {
        // FIX: correct DELETE endpoint — no "/delete" suffix
        await API.delete(`/elections/${eid}`);
        toast.success("Election deleted.");
      } else if (action === "start") {
        await API.post(`/elections/${eid}/start`);
        toast.success("Election started!");
      } else if (action === "end") {
        // FIX: backend accepts POST or PATCH on /end
        await API.post(`/elections/${eid}/end`);
        toast.success("Election ended!");
      } else if (action === "cancel") {
        await API.post(`/elections/${eid}/cancel`);
        toast.success("Election cancelled!");
      }
      load();
    } catch (err) {
      // FIX: always show the real error, never suppress
      const msg = err.response?.data?.error || `Failed to ${action} election.`;
      toast.error(msg);
      console.error(`[doAction:${action}]`, err.response?.data || err.message);
    }
  };

  const tabs = [
    { key:"all",       label:"All" },
    { key:"ongoing",   label:"🟢 Live" },
    { key:"upcoming",  label:"🕐 Upcoming" },
    { key:"ended",     label:"✓ Ended" },
    { key:"cancelled", label:"✕ Cancelled" },
  ];

  const filtered = filter === "all" ? elections : elections.filter(e => e.status === filter);

  return (
    <Layout>
      <div style={{ padding:"28px 24px 48px", maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, color:"#1e3a8a", margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>Elections</h1>
            <p style={{ fontSize:14, color:"#64748b", marginTop:4 }}>{elections.length} total elections</p>
          </div>
          <button onClick={() => navigate("/admin/elections/create")}
            style={{ background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:12, padding:"11px 22px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.3)", fontFamily:"inherit" }}>
            + New Election
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding:"7px 16px", borderRadius:99, border:"1.5px solid", borderColor:filter===t.key ? "#2563eb" : "#dbeafe", background:filter===t.key ? "#2563eb" : "#fff", color:filter===t.key ? "#fff" : "#64748b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ ...S.card, padding:"20px 22px" }}>
                <div className="skeleton" style={{ height:16, width:"50%", borderRadius:6, marginBottom:10 }} />
                <div className="skeleton" style={{ height:12, width:"35%", borderRadius:6 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S.card, padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗳️</div>
            <p style={{ color:"#94a3b8", fontSize:14 }}>No elections found.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {filtered.map((e, i) => {
              const b = badge[e.status] || badge.ended;
              return (
                <div key={e.id} style={{ ...S.card, padding:"20px 22px", animation:`fadeUp ${0.1+i*0.04}s cubic-bezier(.16,1,.3,1)` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:15, color:"#1e3a8a" }}>{e.title}</span>
                        <span style={{ background:b.bg, color:b.color, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{b.label}</span>
                      </div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>
                        📅 {new Date(e.start_time).toLocaleString("en-IN")} → {new Date(e.end_time).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize:12, color:"#94a3b8", marginTop:3 }}>
                        👥 {e.candidate_count||0} candidates • 🗳️ {e.vote_count||0} votes
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={() => navigate(`/admin/elections/${e.id}`)}
                      style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#2563eb", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      📊 Results
                    </button>
                    {(e.status==="upcoming"||e.status==="ongoing") && (
                      <button onClick={() => navigate(`/admin/elections/${e.id}/edit`)}
                        style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#2563eb", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        ✏️ Edit
                      </button>
                    )}
                    <button onClick={() => navigate(`/admin/elections/${e.id}/candidates`)}
                      style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#16a34a", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      👤 Candidates
                    </button>
                    {e.status==="upcoming" && (
                      <button onClick={() => doAction(e.id,"start",e.title)}
                        style={{ background:"#dcfce7", border:"1px solid #bbf7d0", color:"#16a34a", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        ▶ Start
                      </button>
                    )}
                    {e.status==="ongoing" && (
                      <button onClick={() => doAction(e.id,"end",e.title)}
                        style={{ background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        ■ End
                      </button>
                    )}
                    {(e.status==="upcoming"||e.status==="ongoing") && (
                      <button onClick={() => doAction(e.id,"cancel",e.title)}
                        style={{ background:"#fff7ed", border:"1px solid #fed7aa", color:"#d97706", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        ✕ Cancel
                      </button>
                    )}
                    {(e.status==="ended"||e.status==="cancelled") && (
                      <button onClick={() => doAction(e.id,"delete",e.title)}
                        style={{ background:"#fee2e2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        🗑 Delete
                      </button>
                    )}
                  </div>
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