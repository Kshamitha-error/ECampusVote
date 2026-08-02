import { useEffect, useState, useCallback } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import toast from "react-hot-toast";

function timeAgo(dateStr) {
  try {
    const d = new Date(
      dateStr.includes("Z") || dateStr.includes("+")
        ? dateStr
        : dateStr.replace(" ", "T") + "+05:30"
    );
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 5)    return "just now";
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function notifIcon(title) {
  if (!title) return "🔔";
  if (title.includes("Result") || title.includes("Winner")) return "🏆";
  if (title.includes("Live") || title.includes("Started")) return "🟢";
  if (title.includes("Reminder")) return "⏰";
  if (title.includes("Cancel")) return "❌";
  if (title.includes("New Election")) return "🗳️";
  return "🔔";
}

const S = {
  card: { background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 14, padding: "16px 18px" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadCount } = useAuth();

  const load = useCallback(async () => {
    try {
      const r = await API.get("/notifications");
      setNotifications(r.data.notifications || []);
      setUnreadCount(r.data.unread_count || 0);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    await API.patch(`/notifications/${id}/read`).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await API.patch("/notifications/read-all");
      toast.success("All marked as read.");
    } catch {
      toast.error("Failed. Please try again.");
      load();
    }
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <Layout>
      <div style={{ padding: "28px 24px 48px", maxWidth: 700, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>Notifications</h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#2563eb", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ✓ Mark all read
            </button>
          )}
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...S.card }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: "90%", borderRadius: 6, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 10, width: 60, borderRadius: 6 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 16, padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🔔</div>
            <h3 style={{ color: "#1e3a8a", marginBottom: 6, fontFamily: "'Space Grotesk',sans-serif" }}>No notifications yet</h3>
            <p style={{ color: "#64748b", fontSize: 14 }}>You'll be notified about elections and results here.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map((n, i) => (
              <div key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  ...S.card,
                  background: n.is_read ? "#fff" : "#eff6ff",
                  borderColor: n.is_read ? "#dbeafe" : "#93c5fd",
                  cursor: n.is_read ? "default" : "pointer",
                  position: "relative",
                  animation: `fadeUp ${0.1 + i * 0.04}s cubic-bezier(.16,1,.3,1)`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { if (!n.is_read) e.currentTarget.style.borderColor = "#2563eb"; }}
                onMouseLeave={(e) => { if (!n.is_read) e.currentTarget.style.borderColor = "#93c5fd"; }}
              >
                {!n.is_read && (
                  <div style={{ position: "absolute", top: 16, right: 16, width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />
                )}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: n.is_read ? "#f1f5f9" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {notifIcon(n.title)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a", marginBottom: 4 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Layout>
  );
}