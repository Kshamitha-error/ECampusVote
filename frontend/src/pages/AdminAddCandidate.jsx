import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API, { getImageUrl } from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const BRANCHES = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "MBA", "MCA", "OTHER"];
const YEARS    = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const empty = () => ({
  name:         "",
  branch:       "",
  year:         "",
  manifesto:    "",
  achievements: "",
  photo_url:    "",
  symbol_url:   "",
});

const inp = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid #dbeafe", background: "#f0f7ff",
  fontSize: 14, color: "#1e293b", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

export default function AdminAddCandidate() {
  const { id: election_id } = useParams();
  const navigate = useNavigate();

  const [election,   setElection]   = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [form,       setForm]       = useState(empty());
  const [editingId,  setEditingId]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [uploading,  setUploading]  = useState({ photo: false, symbol: false });

  const fetchElection = useCallback(async () => {
    try {
      const res = await API.get(`/elections/${election_id}`);
      setElection(res.data);
    } catch { toast.error("Failed to load election."); }
  }, [election_id]);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await API.get(`/elections/${election_id}/candidates`);
      setCandidates(res.data.candidates || res.data || []);
    } catch { /* silent */ }
  }, [election_id]);

  useEffect(() => {
    document.title = "Add Candidates — eCampus Vote Admin";
    fetchElection();
    fetchCandidates();
  }, [fetchElection, fetchCandidates]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const uploadImage = async (file, field) => {
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await API.post("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set(field === "photo" ? "photo_url" : "symbol_url", res.data.url);
      toast.success(`${field === "photo" ? "Photo" : "Symbol"} uploaded.`);
    } catch { toast.error("Image upload failed."); }
    finally { setUploading(u => ({ ...u, [field]: false })); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Candidate name is required.");
    if (!form.photo_url)   return toast.error("Please upload a candidate photo.");
    if (!form.symbol_url)  return toast.error("Please upload a candidate symbol/logo.");
    setLoading(true);
    try {
      if (editingId) {
        await API.put(`/elections/${election_id}/candidates/${editingId}`, form);
        toast.success("Candidate updated.");
      } else {
        await API.post(`/elections/${election_id}/candidates`, form);
        toast.success("Candidate added.");
      }
      setForm(empty());
      setEditingId(null);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save candidate.");
    } finally { setLoading(false); }
  };

  const handleEdit = (c) => {
    setForm({
      name:         c.name         || "",
      branch:       c.branch       || "",
      year:         c.year         || "",
      manifesto:    c.manifesto    || "",
      achievements: c.achievements || "",
      photo_url:    c.photo_url    || "",
      symbol_url:   c.symbol_url   || c.logo_url || "",
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this candidate?")) return;
    try {
      await API.delete(`/elections/${election_id}/candidates/${id}`);
      toast.success("Candidate removed.");
      fetchCandidates();
    } catch { toast.error("Failed to remove candidate."); }
  };

  const handleDone = () => navigate("/admin/elections");

  const S = {
    card: {
      background: "#fff", border: "1.5px solid #dbeafe",
      borderRadius: 16, boxShadow: "0 2px 12px rgba(59,130,246,0.07)",
    },
    btn: (variant = "primary", disabled = false) => {
      const map = {
        primary: { bg: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff",     border: "none" },
        outline: { bg: "transparent",                              color: "#2563eb",  border: "1.5px solid #bfdbfe" },
        danger:  { bg: "transparent",                              color: "#dc2626",  border: "1.5px solid #fecaca" },
        ghost:   { bg: "#f1f5f9",                                  color: "#475569",  border: "none" },
        success: { bg: "linear-gradient(135deg,#15803d,#16a34a)", color: "#fff",     border: "none" },
      };
      const v = map[variant] || map.primary;
      return {
        padding: "10px 18px", borderRadius: 10, border: v.border,
        background: disabled ? "#e2e8f0" : v.bg,
        color: disabled ? "#94a3b8" : v.color,
        fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", opacity: disabled ? 0.7 : 1,
      };
    },
  };

  const ImageUpload = ({ label, field, url, required }) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <label style={{ cursor: "pointer", display: "block" }}>
        <div style={{
          border: `2px dashed ${url ? "#2563eb" : "#bfdbfe"}`,
          borderRadius: 12, padding: "20px 12px", textAlign: "center",
          background: url ? "#eff6ff" : "#f8faff", minHeight: 110,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {url ? (
            <>
              <img src={getImageUrl(url)} alt={label}
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: field === "photo" ? "50%" : 8, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: "#2563eb" }}>Click to change</div>
            </>
          ) : uploading[field] ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Uploading...</div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{field === "photo" ? "🧑" : "🏷️"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Click to upload</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>JPG, PNG, WEBP</div>
            </>
          )}
        </div>
        <input type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => uploadImage(e.target.files[0], field)} />
      </label>
    </div>
  );

  return (
    <Layout>
      <style>{`
        .inp:focus { border-color: #2563eb !important; background: #fff !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ padding: "28px 24px 60px", maxWidth: 720, margin: "0 auto" }}>

        <button onClick={() => navigate("/admin/elections")}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          ← Back to Elections
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
            {editingId ? "Edit Candidate" : "Add Candidates"}
          </h1>
          {election && (
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              Election: <strong style={{ color: "#1d4ed8" }}>{election.title}</strong>
            </p>
          )}
        </div>

        {/* Form card */}
        <div style={{ ...S.card, padding: 28, marginBottom: 24, animation: "fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 20 }}>
            {editingId ? "Editing candidate" : "New candidate"}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Full Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input className="inp" style={inp} placeholder="Candidate full name"
              value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Branch <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select className="inp" style={{ ...inp, cursor: "pointer" }}
                value={form.branch} onChange={e => set("branch", e.target.value)}>
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Year <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select className="inp" style={{ ...inp, cursor: "pointer" }}
                value={form.year} onChange={e => set("year", e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <ImageUpload label="Candidate Photo" field="photo"   url={form.photo_url}   required />
            <ImageUpload label="Symbol / Logo"   field="symbol"  url={form.symbol_url}  required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Manifesto</label>
            <textarea className="inp" style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
              rows={4} placeholder="Candidate's plans and promises..."
              value={form.manifesto} onChange={e => set("manifesto", e.target.value)} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Achievements</label>
            <textarea className="inp" style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
              rows={3} placeholder="Notable achievements, positions held..."
              value={form.achievements} onChange={e => set("achievements", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} disabled={loading}
              style={{ ...S.btn("primary", loading), flex: 1, padding: "13px" }}>
              {loading ? "Saving..." : editingId ? "Update Candidate" : "Add Candidate"}
            </button>
            {editingId && (
              <button onClick={() => { setForm(empty()); setEditingId(null); }} style={S.btn("ghost")}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Candidates list */}
        <div style={{ ...S.card, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", margin: 0 }}>
              Added Candidates ({candidates.length})
            </h2>
          </div>

          {candidates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 14 }}>
              No candidates added yet. Use the form above to add candidates.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {candidates.map((c, i) => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12,
                  border: "1px solid #e0eaff", background: "#f8faff",
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>
                    {i + 1}
                  </div>

                  {c.photo_url ? (
                    <img src={getImageUrl(c.photo_url)} alt={c.name}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #bfdbfe", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧑</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {[c.branch, c.year].filter(Boolean).join(" · ")}
                    </div>
                  </div>

                  {(c.symbol_url || c.logo_url) && (
                    <img src={getImageUrl(c.symbol_url || c.logo_url)} alt="symbol"
                      style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, border: "1px solid #dbeafe", flexShrink: 0 }} />
                  )}

                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button style={{ ...S.btn("outline"), padding: "6px 14px", fontSize: 12 }}
                      onClick={() => handleEdit(c)}>Edit</button>
                    <button style={{ ...S.btn("danger"), padding: "6px 14px", fontSize: 12 }}
                      onClick={() => handleDelete(c.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleDone}
          style={{ ...S.btn("success"), width: "100%", padding: "14px", fontSize: 15, textAlign: "center" }}>
          {candidates.length > 0 ? `Done — ${candidates.length} candidate(s) added ✓` : "Skip & Finish"}
        </button>

      </div>
    </Layout>
  );
}