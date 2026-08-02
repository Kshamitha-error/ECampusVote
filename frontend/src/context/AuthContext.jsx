import { createContext, useContext, useState, useEffect } from "react";
import API from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } });
  const [role,  setRole]  = useState(() => localStorage.getItem("role"));
  const [unreadCount, setUnreadCount] = useState(0);

  const loginStudent = (accessToken, studentData) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user",  JSON.stringify(studentData));
    localStorage.setItem("role",  "student");
    setToken(accessToken); setUser(studentData); setRole("student");
  };

  const loginAdmin = (accessToken) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("role",  "admin");
    localStorage.removeItem("user");
    setToken(accessToken); setUser(null); setRole("admin");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setToken(null); setUser(null); setRole(null); setUnreadCount(0);
  };

  // FIX: StudentProfile.jsx was calling a `setUser` from useAuth() that
  // never existed on this context — so after saving a name change, the
  // header/avatar/dashboard kept showing the OLD name until logging out and
  // back in (nothing updated React state, and localStorage stayed stale too).
  // This wrapper updates both.
  const updateUser = (studentData) => {
    localStorage.setItem("user", JSON.stringify(studentData));
    setUser(studentData);
  };

  useEffect(() => {
    if (role === "student" && token) {
      API.get("/notifications")
        .then(r => setUnreadCount(r.data.unread_count || 0))
        .catch(() => {});
    }
  }, [role, token]);

  // FIX: the notification bell badge used to be fetched only once, at
  // login. It never updated again until the next login, so a new
  // notification arriving while you browsed the app wouldn't show up in the
  // header. This polls every 30s (matching the Notifications page itself)
  // for as long as a student is logged in.
  useEffect(() => {
    if (role !== "student" || !token) return;
    const interval = setInterval(() => {
      API.get("/notifications")
        .then(r => setUnreadCount(r.data.unread_count || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [role, token]);

  return (
    <AuthContext.Provider value={{ token, user, role, loading:false, unreadCount, setUnreadCount, loginStudent, loginAdmin, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }