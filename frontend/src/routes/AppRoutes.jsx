import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import PageLoader from "../components/common/PageLoader";

// Lazy-loaded public views
const LandingPage = lazy(() => import("../pages/public/LandingPage/LandingPage"));
const SafetyPage = lazy(() => import("../pages/public/SafetyPage/SafetyPage"));
const AboutPage = lazy(() => import("../pages/public/AboutPage/AboutPage"));
const SignIn = lazy(() => import("../pages/public/SignIn/SignIn"));
const SignUp = lazy(() => import("../pages/public/SignUp/SignUp"));
const NotFound = lazy(() => import("../pages/public/NotFound/NotFound"));

// Lazy-loaded patient workspace views
const PatientDashboard = lazy(() => import("../pages/patient/PatientDashboard/PatientDashboard"));
const PatientConsultation = lazy(() => import("../pages/patient/PatientConsultation/PatientConsultation"));
const PatientCases = lazy(() => import("../pages/patient/PatientCases/PatientCases"));
const PatientProfile = lazy(() => import("../pages/patient/PatientProfile/PatientProfile"));

// Lazy-loaded professional workspace views
const ProfessionalDashboard = lazy(() => import("../pages/professional/ProfessionalDashboard/ProfessionalDashboard"));
const ProfessionalQueue = lazy(() => import("../pages/professional/ProfessionalQueue/ProfessionalQueue"));
const ProfessionalCases = lazy(() => import("../pages/professional/ProfessionalCases/ProfessionalCases"));
const ProfessionalProfile = lazy(() => import("../pages/professional/ProfessionalProfile/ProfessionalProfile"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader message="Loading DoctAir..." />}>
      <Routes>
        {/* ── Public Standalone Routes ────────────────────────────── */}
        {/* Landing page retains its dedicated layout and full marketing sections */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Informational & Safety Routes (wrapped in PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/404" element={<NotFound />} />
        </Route>

        {/* Authentication Routes */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />

        {/* Backwards-compatible aliases */}
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />
        <Route path="/signup" element={<Navigate to="/sign-up" replace />} />
        <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />

        {/* ── Patient Workspace Routes ────────────────────────────── */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute enforce={false}>
              <RoleRoute allowedRoles={["PATIENT"]} enforce={false}>
                <AppLayout role="patient" />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="consultation" element={<PatientConsultation />} />
          <Route path="cases" element={<PatientCases />} />
          <Route path="profile" element={<PatientProfile />} />
        </Route>

        {/* ── Professional Workspace Routes ───────────────────────── */}
        <Route
          path="/professional"
          element={
            <ProtectedRoute enforce={false}>
              <RoleRoute allowedRoles={["PROFESSIONAL", "ADMIN"]} enforce={false}>
                <AppLayout role="professional" />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/professional/dashboard" replace />} />
          <Route path="dashboard" element={<ProfessionalDashboard />} />
          <Route path="queue" element={<ProfessionalQueue />} />
          <Route path="cases" element={<ProfessionalCases />} />
          <Route path="profile" element={<ProfessionalProfile />} />
        </Route>

        {/* ── Wildcard Error Route ─────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
