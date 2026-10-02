import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.js';
import { AppShell } from './components/AppShell.jsx';
import { ClearIcon } from './components/ClearIcon.jsx';
import {
  ActionCenterPage,
  DecisionHubPage,
  MessageCenterPage,
  RevisionDeskPage,
} from './pages/ActionCenterPages.jsx';
import { ApplicationPage } from './pages/ApplicationPage.jsx';
import { CommitteeDashboard, CommitteeViewPage } from './pages/CommitteePages.jsx';
import { DocumentPage } from './pages/DocumentPage.jsx';
import { GuidelinesPage } from './pages/GuidelinesPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NewRequestPage } from './pages/NewRequestPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { RequirementPage } from './pages/RequirementPage.jsx';
import { StudentDashboard } from './pages/StudentDashboard.jsx';
import { SplashPage } from './pages/SplashPage.jsx';
import { StyleguidePage } from './pages/StyleguidePage.jsx';

function FullPageLoading() {
  return (
    <div className="app-loading" role="status" aria-label="Loading CLEAR">
      <span className="app-loading__mark"><ClearIcon size={78} /></span>
      <span className="app-loading__bar" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <AppShell />;
}

function RoleRoute({ allowed, children }) {
  const { user } = useAuth();
  return allowed.includes(user.role) ? children : <Navigate to="/" replace />;
}

function DashboardRoute() {
  const { user } = useAuth();
  if (user.role === 'professor' || user.role === 'admin') return <CommitteeDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access" element={<LandingPage />} />
      <Route path="/welcome" element={<SplashPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardRoute />} />
        <Route
          path="/requests/new"
          element={(
            <RoleRoute allowed={['student']}>
              <NewRequestPage />
            </RoleRoute>
          )}
        />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route
          path="/application"
          element={(
            <RoleRoute allowed={['student']}>
              <ApplicationPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/application/:id/requirements"
          element={(
            <RoleRoute allowed={['student']}>
              <RequirementPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/action-center"
          element={(
            <RoleRoute allowed={['student', 'professor', 'admin']}>
              <ActionCenterPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/action-center/decisions"
          element={(
            <RoleRoute allowed={['student', 'professor', 'admin']}>
              <DecisionHubPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/action-center/revisions"
          element={(
            <RoleRoute allowed={['student', 'professor', 'admin']}>
              <RevisionDeskPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/action-center/messages"
          element={(
            <RoleRoute allowed={['student', 'professor', 'admin']}>
              <MessageCenterPage />
            </RoleRoute>
          )}
        />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/committee" element={<Navigate to="/" replace />} />
        <Route
          path="/committee/:view"
          element={(
            <RoleRoute allowed={['professor', 'admin']}>
              <CommitteeViewPage />
            </RoleRoute>
          )}
        />
        <Route
          path="/guidelines"
          element={(
            <RoleRoute allowed={['professor', 'admin']}>
              <GuidelinesPage />
            </RoleRoute>
          )}
        />
        <Route path="/styleguide" element={<StyleguidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
