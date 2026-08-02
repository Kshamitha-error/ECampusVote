import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const studentLinks = [
  { to:"/dashboard",     icon:"🏠", label:"Dashboard" },
  { to:"/elections",     icon:"🗳️", label:"Elections" },
  { to:"/notifications", icon:"🔔", label:"Notifications" },
  { to:"/profile",       icon:"👤", label:"Profile" },
];
const adminLinks = [
  { to:"/admin/dashboard",        icon:"🏠", label:"Dashboard" },
  { to:"/admin/elections",        icon:"🗳️", label:"Elections" },
  { to:"/admin/elections/create", icon:"➕", label:"New Election" },
  { to:"/admin/students",         icon:"👥", label:"Students" },
];

function LogoMark({ white }) {
  const [err, setErr] = useState(false);
  return err ? (
    <span style={{ fontSize:28 }}>🗳️</span>
  ) : (
    <img src="/logo.png" alt="" onError={() => setErr(true)}
      style={{ height:36, objectFit:"contain", filter:white ? "brightness(0) invert(1)" : "none" }} />
  );
}

export default function Layout({ children }) {
  const { user, role, logout, unreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links    = role === "admin" ? adminLinks : studentLinks;
  const isActive = (to) => to.length > 15 ? location.pathname.startsWith(to) : location.pathname === to;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
      navigate(role === "admin" ? "/admin/login" : "/");
    }
  };

  const SidebarContent = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"linear-gradient(180deg,#1e3a8a 0%,#1d4ed8 100%)" }}>

      {/* Logo */}
      <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", gap:10 }}>
        <LogoMark white={true} />
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#fff", fontFamily:"'Space Grotesk',sans-serif" }}>eCampus Vote</div>
          <div style={{ fontSize:10, color:"#93c5fd" }}>{role === "admin" ? "ADMIN PANEL" : "STUDENT PORTAL"}</div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff", flexShrink:0 }}>
            {(user?.name || (role==="admin"?"A":"S"))[0].toUpperCase()}
          </div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontWeight:600, fontSize:13, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {user?.name || (role==="admin" ? "Administrator" : "Student")}
            </div>
            <div style={{ fontSize:11, color:"#93c5fd" }}>{role==="admin" ? "Admin" : user?.email || ""}</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex:1, padding:"8px 8px", overflowY:"auto" }}>
        {links.map(({ to, icon, label }) => {
          const active = isActive(to);
          return (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, marginBottom:2, background:active?"rgba(255,255,255,0.2)":"transparent", color:active?"#fff":"#bfdbfe", fontWeight:active?700:500, fontSize:14, textDecoration:"none", transition:"all 0.2s" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background="rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{ fontSize:16 }}>{icon}</span>
              <span style={{ flex:1 }}>{label}</span>
              {label==="Notifications" && unreadCount>0 && (
                <span style={{ background:"#ef4444", color:"#fff", borderRadius:99, fontSize:10, fontWeight:700, padding:"2px 6px" }}>{unreadCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding:"8px 8px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={handleLogout}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
          <span>🚪</span><span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f6ff" }}>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ width:240, flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {open && <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40 }} />}

      {/* Mobile drawer */}
      <div style={{ position:"fixed", top:0, left:0, width:260, height:"100vh", zIndex:50, transform:open?"translateX(0)":"translateX(-100%)", transition:"transform 0.3s cubic-bezier(.16,1,.3,1)" }}>
        <SidebarContent />
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{ display:"none", alignItems:"center", gap:12, padding:"14px 16px", background:"linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
          <button onClick={() => setOpen(true)} style={{ background:"none", border:"none", cursor:"pointer", color:"#fff", fontSize:22 }}>☰</button>
          <span style={{ fontWeight:800, fontSize:16, color:"#fff", fontFamily:"'Space Grotesk',sans-serif" }}>eCampus Vote</span>
          {role!=="admin" && unreadCount>0 && (
            <span style={{ marginLeft:"auto", background:"#ef4444", color:"#fff", borderRadius:99, fontSize:11, fontWeight:700, padding:"2px 8px" }}>{unreadCount}</span>
          )}
        </div>

        <main style={{ flex:1 }}>{children}</main>
      </div>

      <style>{`
        @media(min-width:768px){
          .desktop-sidebar{display:flex!important;flex-direction:column;}
          .mobile-topbar{display:none!important;}
        }
        @media(max-width:767px){
          .desktop-sidebar{display:none!important;}
          .mobile-topbar{display:flex!important;}
        }
        .skeleton{background:#e2e8f0;animation:shimmer 1.5s infinite;}
        @keyframes shimmer{0%{opacity:1}50%{opacity:0.5}100%{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}