import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";

import StudentLogin          from "./pages/StudentLogin";
import StudentReturningLogin from "./pages/StudentReturningLogin";
import VerifyOTP             from "./pages/VerifyOTP";
import SetPassword           from "./pages/SetPassword";
import ForgotPassword        from "./pages/ForgotPassword";
import StudentDashboard      from "./pages/StudentDashboard";
import StudentProfile        from "./pages/StudentProfile";
import ElectionsList         from "./pages/ElectionsList";
import ElectionDetail        from "./pages/ElectionDetail";
import CandidateDetail       from "./pages/CandidateDetail";
import CastVote              from "./pages/CastVote";
import Notifications         from "./pages/Notifications";
import AdminLogin            from "./pages/AdminLogin";
import AdminDashboard        from "./pages/AdminDashboard";
import AdminElections        from "./pages/AdminElections";
import AdminCreateElection   from "./pages/AdminCreateElection";
import AdminAddCandidate     from "./pages/AdminAddCandidate";
import AdminElectionDetail   from "./pages/AdminElectionDetail";
import AdminEditElection     from "./pages/AdminEditElection";
import AdminStudents         from "./pages/AdminStudents";

// Page titles per route
const PAGE_TITLES = {
  "/":                        "eCampus Vote — Login",
  "/returning-login":         "eCampus Vote — Sign In",
  "/verify-otp":              "eCampus Vote — Verify OTP",
  "/set-password":            "eCampus Vote — Set Password",
  "/forgot-password":         "eCampus Vote — Forgot Password",
  "/dashboard":               "eCampus Vote — Dashboard",
  "/elections":               "eCampus Vote — Elections",
  "/notifications":           "eCampus Vote — Notifications",
  "/profile":                 "eCampus Vote — My Profile",
  "/admin/login":             "eCampus Vote — Admin Login",
  "/admin/dashboard":         "eCampus Vote — Admin Dashboard",
  "/admin/elections":         "eCampus Vote — Manage Elections",
  "/admin/elections/create":  "eCampus Vote — Create Election",
  "/admin/students":          "eCampus Vote — Manage Students",
};

function TitleUpdater() {
  const location = useLocation();
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || "eCampus Vote";
    document.title = title;
  }, [location]);
  return null;
}

function ProtectedRoute({ children, requiredRole }) {
  const { token, role } = useAuth();
  if (!token) {
    return <Navigate to={requiredRole === "admin" ? "/admin/login" : "/"} replace />;
  }
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
  }
  return children;
}

function AppRoutes() {
  const { token, role } = useAuth();
  return (
    <>
      <TitleUpdater />
      <Routes>
        {/* Public auth */}
        <Route path="/"                   element={<StudentLogin />} />
        <Route path="/returning-login"    element={<StudentReturningLogin />} />
        <Route path="/verify-otp"         element={<VerifyOTP />} />
        <Route path="/set-password"       element={<SetPassword />} />
        <Route path="/forgot-password"    element={<ForgotPassword />} />
        <Route path="/admin/login"        element={<AdminLogin />} />

        {/* Student */}
        <Route path="/dashboard"          element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/profile"            element={<ProtectedRoute requiredRole="student"><StudentProfile /></ProtectedRoute>} />
        <Route path="/elections"          element={<ProtectedRoute requiredRole="student"><ElectionsList /></ProtectedRoute>} />
        <Route path="/elections/:id"      element={<ProtectedRoute requiredRole="student"><ElectionDetail /></ProtectedRoute>} />
        <Route path="/elections/:id/vote" element={<ProtectedRoute requiredRole="student"><CastVote /></ProtectedRoute>} />
        <Route path="/candidates/:id"     element={<ProtectedRoute requiredRole="student"><CandidateDetail /></ProtectedRoute>} />
        <Route path="/notifications"      element={<ProtectedRoute requiredRole="student"><Notifications /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard"            element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/elections"            element={<ProtectedRoute requiredRole="admin"><AdminElections /></ProtectedRoute>} />
        <Route path="/admin/elections/create"     element={<ProtectedRoute requiredRole="admin"><AdminCreateElection /></ProtectedRoute>} />
        <Route path="/admin/elections/:id"        element={<ProtectedRoute requiredRole="admin"><AdminElectionDetail /></ProtectedRoute>} />
        <Route path="/admin/elections/:id/candidates" element={<ProtectedRoute requiredRole="admin"><AdminAddCandidate /></ProtectedRoute>} />
        <Route path="/admin/elections/:id/edit"   element={<ProtectedRoute requiredRole="admin"><AdminEditElection /></ProtectedRoute>} />
        <Route path="/admin/students"             element={<ProtectedRoute requiredRole="admin"><AdminStudents /></ProtectedRoute>} />

        {/* 404 fallback */}
        <Route path="*" element={
          token
            ? <Navigate to={role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />
            : <Navigate to="/" replace />
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#fff",
              color: "#1e293b",
              border: "1.5px solid #dbeafe",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(59,130,246,0.15)",
            },
            success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}