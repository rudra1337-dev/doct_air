import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import PublicLayout from '../layouts/PublicLayout';
import AppLayout from '../layouts/AppLayout';
import PageLoader from '../components/common/PageLoader';
import { useAuth } from '../context/AuthContext';

// Lazy-loaded public views
const LandingPage = lazy(() => import('../pages/public/LandingPage/LandingPage'));
const SafetyPage = lazy(() => import('../pages/public/SafetyPage/SafetyPage'));
const AboutPage = lazy(() => import('../pages/public/AboutPage/AboutPage'));
const SignIn = lazy(() => import('../pages/public/SignIn/SignIn'));
const SignUp = lazy(() => import('../pages/public/SignUp/SignUp'));
const NotFound = lazy(() => import('../pages/public/NotFound/NotFound'));

// Lazy-loaded patient workspace views
const PatientDashboard = lazy(() => import('../pages/patient/PatientDashboard/PatientDashboard'));
const PatientConsultation = lazy(() => import('../pages/patient/PatientConsultation/PatientConsultation'));
const PatientCases = lazy(() => import('../pages/patient/PatientCases/PatientCases'));
const PatientProfile = lazy(() => import('../pages/patient/PatientProfile/PatientProfile'));

// Lazy-loaded professional workspace views
const ProfessionalDashboard = lazy(() => import('../pages/professional/ProfessionalDashboard/ProfessionalDashboard'));
const ProfessionalQueue = lazy(() => import('../pages/professional/ProfessionalQueue/ProfessionalQueue'));
const ProfessionalCases = lazy(() => import('../pages/professional/ProfessionalCases/ProfessionalCases'));
const ProfessionalProfile = lazy(() => import('../pages/professional/ProfessionalProfile/ProfessionalProfile'));

// Lazy-loaded structured case review view
const CaseReviewPage = lazy(() => import('../pages/case/CaseReview/CaseReviewPage'));

// Lazy-loaded medical intake report view
const MedicalReportPage = lazy(() => import('../pages/case/MedicalReport/MedicalReportPage'));

/**
 * Route wrapper that redirects already-authenticated users directly to their workspace
 */
function PublicOnlyRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader message="Loading..." />;
  if (isAuthenticated && user) {
    const target =
      user.role === 'PROFESSIONAL' || user.role === 'ADMIN'
        ? '/professional/dashboard'
        : '/patient/dashboard';
    return <Navigate to={target} replace />;
  }
  return children;
}

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

        {/* Authentication Routes (redirect to workspace if already signed in) */}
        <Route
          path="/sign-in"
          element={
            <PublicOnlyRoute>
              <SignIn />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/sign-up"
          element={
            <PublicOnlyRoute>
              <SignUp />
            </PublicOnlyRoute>
          }
        />

        {/* Backwards-compatible aliases */}
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />
        <Route path="/signup" element={<Navigate to="/sign-up" replace />} />
        <Route path="/dashboard" element={<Navigate to="/patient/dashboard" replace />} />

        {/* ── Patient Workspace Routes (Requires PATIENT role) ──────── */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['PATIENT']}>
                <AppLayout role="patient" />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="consultation" element={<PatientConsultation />} />
          <Route path="consultation/:conversationId" element={<PatientConsultation />} />
          <Route path="cases" element={<PatientCases />} />
          <Route path="cases/:caseId" element={<CaseReviewPage role="patient" />} />
          <Route path="cases/:caseId/report" element={<MedicalReportPage role="patient" />} />
          <Route path="cases/conversation/:conversationId" element={<CaseReviewPage role="patient" />} />
          <Route path="cases/conversation/:conversationId/report" element={<MedicalReportPage role="patient" />} />
          <Route path="consultation/:conversationId/case" element={<CaseReviewPage role="patient" />} />
          <Route path="consultation/:conversationId/report" element={<MedicalReportPage role="patient" />} />
          <Route path="profile" element={<PatientProfile />} />
        </Route>

        {/* ── Professional Workspace Routes (Requires PROFESSIONAL or ADMIN role) ─ */}
        <Route
          path="/professional"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['PROFESSIONAL', 'ADMIN']}>
                <AppLayout role="professional" />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/professional/dashboard" replace />} />
          <Route path="dashboard" element={<ProfessionalDashboard />} />
          <Route path="queue" element={<ProfessionalQueue />} />
          <Route path="cases" element={<ProfessionalCases />} />
          <Route path="cases/:caseId" element={<CaseReviewPage role="professional" />} />
          <Route path="cases/:caseId/report" element={<MedicalReportPage role="professional" />} />
          <Route path="cases/conversation/:conversationId" element={<CaseReviewPage role="professional" />} />
          <Route path="cases/conversation/:conversationId/report" element={<MedicalReportPage role="professional" />} />
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
