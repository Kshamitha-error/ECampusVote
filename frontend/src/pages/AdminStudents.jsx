import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

const S = {
  card: {
    background: "#fff",
    border: "1.5px solid #dbeafe",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(59,130,246,0.07)",
  },
  tab: (active) => ({
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: active ? "#2563eb" : "transparent",
    color: active ? "#fff" : "#64748b",
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  }),
  btn: (variant = "primary") => {
    const map = {
      primary:  { bg: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff", border: "none", shadow: "0 4px 12px rgba(37,99,235,0.25)" },
      outline:  { bg: "transparent", color: "#2563eb", border: "1.5px solid #bfdbfe", shadow: "none" },
      danger:   { bg: "transparent", color: "#dc2626", border: "1.5px solid #fecaca", shadow: "none" },
      ghost:    { bg: "#f1f5f9", color: "#475569", border: "none", shadow: "none" },
    };
    const v = map[variant] || map.primary;
    return {
      padding: "10px 18px", borderRadius: 10, border: v.border,
      background: v.bg, color: v.color, fontWeight: 600, fontSize: 13,
      cursor: "pointer", fontFamily: "inherit", boxShadow: v.shadow,
    };
  },
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCards({ stats }) {
  const items = [
    { label: "Total students",   value: stats.total,          color: "#1d4ed8", bg: "#eff6ff" },
    { label: "Registered",       value: stats.registered,     color: "#16a34a", bg: "#dcfce7" },
    { label: "Not registered",   value: stats.not_registered, color: "#d97706", bg: "#fef3c7" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
      {items.map(s => (
        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value ?? "—"}</div>
          <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Badge({ registered }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
      background: registered ? "#dcfce7" : "#fef3c7",
      color: registered ? "#16a34a" : "#d97706",
    }}>
      {registered ? "Registered" : "Not registered"}
    </span>
  );
}

// ─────────────────────────────────────────────
// Tab 1 — All Students
// ─────────────────────────────────────────────

function AllStudents({ onRefreshStats }) {
  const [students,  setStudents]  = useState([]);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const PER_PAGE = 50;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/uploads/students", { params: { page, per_page: PER_PAGE, search } });
      setStudents(res.data.students);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setSelected([]);
    } catch { toast.error("Failed to load students."); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(prev => prev.length === students.length ? [] : students.map(s => s.id));

  const handleDelete = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} student(s)? This cannot be undone.`)) return;
    try {
      await API.post("/uploads/students/bulk-delete", { ids });
      toast.success(`${ids.length} student(s) deleted.`);
      fetchStudents();
      onRefreshStats();
    } catch { toast.error("Delete failed."); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, roll number or email..."
          style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "1.5px solid #dbeafe", fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
        {selected.length > 0 && (
          <button style={S.btn("danger")} onClick={() => handleDelete(selected)}>
            Remove selected ({selected.length})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading...</div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No students found.</div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>
                  <input type="checkbox" checked={selected.length === students.length && students.length > 0}
                    onChange={toggleAll} />
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Name / Email</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Roll No</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Branch</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Year</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, color: "#1e3a8a" }}>{s.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.email}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{s.roll_no}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{s.branch || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{s.year ? `${s.year}${["st","nd","rd","th"][s.year-1]} yr` : "—"}</td>
                  <td style={{ padding: "10px 12px" }}><Badge registered={s.registered} /></td>
                  <td style={{ padding: "10px 12px" }}>
                    <button style={{ ...S.btn("danger"), padding: "5px 12px", fontSize: 12 }}
                      onClick={() => handleDelete([s.id])}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 13, color: "#64748b" }}>
            <span>Showing {students.length} of {total} students</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btn("ghost")} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ padding: "10px 14px" }}>Page {page} / {pages}</span>
              <button style={S.btn("ghost")} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab 2 — Upload CSV
// ─────────────────────────────────────────────

function UploadCSV({ onRefreshStats }) {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a CSV file.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await API.post("/uploads/students-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      toast.success(res.data.message);
      onRefreshStats();
    } catch (err) { toast.error(err.response?.data?.error || "Upload failed."); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const csv = "email,roll_no,branch,year\nstudent1@college.edu,23UP1A0501,CSE,1\nstudent2@college.edu,23UP1A0502,ECE,2";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 20 }}>
        CSV must have columns: <strong>email</strong>, <strong>roll_no</strong>. Optional: <strong>branch</strong>, <strong>year</strong> (1–4). Existing students are skipped automatically.
      </div>

      <label style={{ display: "block", cursor: "pointer", marginBottom: 16 }}>
        <div style={{ border: `2px dashed ${file ? "#2563eb" : "#bfdbfe"}`, borderRadius: 12, padding: "32px 20px", textAlign: "center", background: file ? "#eff6ff" : "#f8faff" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: 14 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Click to change file</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: "#1e3a8a", fontSize: 14 }}>Click to select CSV file</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Only .csv files accepted</div>
            </>
          )}
        </div>
        <input type="file" accept=".csv" onChange={e => { setFile(e.target.files[0]); setResult(null); }} style={{ display: "none" }} />
      </label>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={handleUpload} disabled={loading || !file} style={{ ...S.btn("primary"), flex: 1, opacity: !file ? 0.5 : 1 }}>
          {loading ? "Uploading..." : "⬆️ Upload Students"}
        </button>
        <button onClick={downloadTemplate} style={S.btn("outline")}>📥 Template</button>
      </div>

      {result && (
        <div style={{ ...S.card, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 16 }}>Upload Results</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Added",   value: result.added?.length || 0,   color: "#16a34a", bg: "#dcfce7" },
              { label: "Existed", value: result.skipped?.length || 0, color: "#d97706", bg: "#fef3c7" },
              { label: "Errors",  value: result.errors?.length || 0,  color: "#dc2626", bg: "#fee2e2" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div style={{ background: "#fff5f5", borderRadius: 10, padding: "10px 14px", border: "1px solid #fecaca", maxHeight: 120, overflowY: "auto" }}>
              {result.errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: "#dc2626", padding: "2px 0" }}>{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab 3 — Add Single Student
// ─────────────────────────────────────────────

function AddSingle({ onRefreshStats }) {
  const [form,    setForm]    = useState({ email: "", roll_no: "", branch: "", year: "" });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.email || !form.roll_no) return toast.error("Email and roll number are required.");
    setLoading(true);
    try {
      const csv  = `email,roll_no,branch,year\n${form.email},${form.roll_no},${form.branch},${form.year}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const file = new File([blob], "single.csv");
      const fd   = new FormData();
      fd.append("file", file);
      const res = await API.post("/uploads/students-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.added?.length > 0) {
        toast.success("Student added successfully.");
        setForm({ email: "", roll_no: "", branch: "", year: "" });
        onRefreshStats();
      } else if (res.data.skipped?.length > 0) {
        toast.error("Student already exists.");
      } else {
        toast.error(res.data.errors?.[0] || "Failed to add student.");
      }
    } catch (err) { toast.error(err.response?.data?.error || "Failed."); }
    finally { setLoading(false); }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
      {key === "year" ? (
        <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dbeafe", fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#1e3a8a" }}>
          <option value="">Select year</option>
          {[1,2,3,4].map(y => <option key={y} value={y}>{y}{["st","nd","rd","th"][y-1]} year</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dbeafe", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 420 }}>
      {field("Email *", "email", "email", "student@college.edu")}
      {field("Roll Number *", "roll_no", "text", "23UP1A0501")}
      {field("Branch", "branch", "text", "CSE")}
      {field("Year", "year")}
      <button onClick={handleAdd} disabled={loading} style={{ ...S.btn("primary"), width: "100%", marginTop: 8 }}>
        {loading ? "Adding..." : "Add Student"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab 4 — Year Rollover
// ─────────────────────────────────────────────

function YearRollover({ onRefreshStats }) {
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetText, setResetText] = useState("");

  useEffect(() => { fetchPreview(); }, []);

  const fetchPreview = async () => {
    try {
      const res = await API.get("/uploads/students/rollover/preview");
      setPreview(res.data);
    } catch { toast.error("Failed to load rollover preview."); }
  };

  const removePassouts = async () => {
    if (!window.confirm(`Remove all ${preview?.["4"] || 0} 4th year students permanently?`)) return;
    setLoading(true);
    try {
      const res = await API.post("/uploads/students/rollover/remove-passouts");
      toast.success(res.data.message);
      setStep1Done(true);
      fetchPreview();
      onRefreshStats();
    } catch { toast.error("Failed."); }
    finally { setLoading(false); }
  };

  const upgradeYears = async () => {
    if (!window.confirm("Upgrade all student years? (1→2, 2→3, 3→4)")) return;
    setLoading(true);
    try {
      const res = await API.post("/uploads/students/rollover/upgrade-years");
      toast.success(res.data.message);
      setStep2Done(true);
      fetchPreview();
      onRefreshStats();
    } catch { toast.error("Failed."); }
    finally { setLoading(false); }
  };

  const hardReset = async () => {
    if (resetText !== "DELETE") return toast.error("Type DELETE to confirm.");
    setLoading(true);
    try {
      const res = await API.delete("/uploads/students/reset-all", { data: { confirm: "DELETE" } });
      toast.success(res.data.message);
      setShowReset(false);
      setResetText("");
      fetchPreview();
      onRefreshStats();
    } catch { toast.error("Failed."); }
    finally { setLoading(false); }
  };

  const stepCard = (num, title, badge, description, action, done) => (
    <div style={{ border: `1.5px solid ${done ? "#bbf7d0" : "#dbeafe"}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "14px 18px", background: done ? "#f0fdf4" : "#f8faff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: done ? "#15803d" : "#1e3a8a" }}>Step {num} — {title} {done && "✓"}</div>
        {badge}
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{description}</div>
        {!done && action}
      </div>
    </div>
  );

  const pill = (text, danger) => (
    <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 20, fontWeight: 600, background: danger ? "#fee2e2" : "#eff6ff", color: danger ? "#dc2626" : "#2563eb", border: `1px solid ${danger ? "#fecaca" : "#bfdbfe"}` }}>{text}</span>
  );

  return (
    <div>
      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 20 }}>
        ⚠️ Run these steps at the start of each academic year. Steps are irreversible.
      </div>

      {preview && stepCard(1, "Remove passouts",
        pill(`${preview["4"] || 0} will be deleted`, true),
        "All 4th year students will be permanently removed from the system.",
        <button style={S.btn("danger")} onClick={removePassouts} disabled={loading || preview["4"] === 0}>
          {loading ? "Processing..." : "Confirm remove 4th years"}
        </button>,
        step1Done
      )}

      {preview && stepCard(2, "Upgrade years",
        pill(`${(preview["1"]||0)+(preview["2"]||0)+(preview["3"]||0)} students`, false),
        <>
          {[["1st","2nd", preview?.["1"]], ["2nd","3rd", preview?.["2"]], ["3rd","4th", preview?.["3"]]].map(([f,t,c]) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>{f} year</span>
              <span style={{ color: "#94a3b8" }}>→</span>
              <span style={{ fontWeight: 600, color: "#1e3a8a" }}>{t} year</span>
              <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#eff6ff", color: "#2563eb" }}>{c || 0} students</span>
            </div>
          ))}
        </>,
        <button style={S.btn("primary")} onClick={upgradeYears} disabled={loading} className="mt-2">
          {loading ? "Processing..." : "Confirm year upgrade"}
        </button>,
        step2Done
      )}

      {stepCard(3, "Upload new 1st years",
        pill("after upgrade", false),
        "Upload the new batch CSV. It will be merged as 1st year students automatically.",
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...S.btn("outline"), cursor: "pointer" }}>
            📂 Upload 1st year CSV
            <input type="file" accept=".csv" style={{ display: "none" }}
              onChange={async e => {
                const f = e.target.files[0]; if (!f) return;
                const fd = new FormData(); fd.append("file", f);
                try {
                  const res = await API.post("/uploads/students-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
                  toast.success(res.data.message); onRefreshStats();
                } catch { toast.error("Upload failed."); }
              }} />
          </label>
        </div>,
        false
      )}

      {/* Danger zone */}
      <div style={{ marginTop: 24, padding: "16px 18px", border: "1.5px solid #fecaca", borderRadius: 14, background: "#fff5f5" }}>
        <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4, fontSize: 14 }}>Danger zone</div>
        <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>Permanently deletes ALL student records, votes and notifications. Cannot be undone.</div>
        {!showReset ? (
          <button style={S.btn("danger")} onClick={() => setShowReset(true)}>Clear all students</button>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={resetText} onChange={e => setResetText(e.target.value)} placeholder='Type "DELETE" to confirm'
              style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #fecaca", fontSize: 13, fontFamily: "inherit", width: 220 }} />
            <button style={S.btn("danger")} onClick={hardReset} disabled={loading || resetText !== "DELETE"}>Confirm delete all</button>
            <button style={S.btn("ghost")} onClick={() => { setShowReset(false); setResetText(""); }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function AdminStudents() {
  const [tab,   setTab]   = useState("all");
  const [stats, setStats] = useState({ total: null, registered: null, not_registered: null });
  const navigate = useNavigate();

  useEffect(() => { document.title = "Manage Students — Admin"; }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("/uploads/students/stats");
      setStats(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const tabs = [
    { key: "all",      label: "All students" },
    { key: "upload",   label: "Upload CSV"   },
    { key: "add",      label: "Add single"   },
    { key: "rollover", label: "Year rollover"},
  ];

  return (
    <Layout>
      <div style={{ padding: "28px 24px 48px", maxWidth: 860, margin: "0 auto" }}>
        <button onClick={() => navigate("/admin/dashboard")}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          ← Back to Dashboard
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>Manage Students</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Upload, manage, and maintain your student database.</p>
        </div>

        <StatCards stats={stats} />

        <div style={{ ...S.card, padding: 28 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {tab === "all"      && <AllStudents    onRefreshStats={fetchStats} />}
          {tab === "upload"   && <UploadCSV      onRefreshStats={fetchStats} />}
          {tab === "add"      && <AddSingle      onRefreshStats={fetchStats} />}
          {tab === "rollover" && <YearRollover   onRefreshStats={fetchStats} />}
        </div>
      </div>
    </Layout>
  );
}