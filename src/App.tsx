import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import { ClipboardProvider } from './contexts/ClipboardContext';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { USER_ROLES } from './constants/roles';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { FileManagerPage } from './pages/FileManagerPage';
import { SupervisorInboxPage } from './pages/SupervisorInboxPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

function App() {
  return (
    <ProjectProvider>
      <ClipboardProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Navigate to="/home" replace />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <HomePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProjectsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/files"
              element={
                <RoleRoute
                  allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPERVISOR, USER_ROLES.ANALYST]}
                >
                  <MainLayout>
                    <FileManagerPage />
                  </MainLayout>
                </RoleRoute>
              }
            />
            <Route
              path="/supervisor"
              element={
                <RoleRoute allowedRoles={[USER_ROLES.SUPERVISOR, USER_ROLES.ADMIN]}>
                  <MainLayout>
                    <SupervisorInboxPage />
                  </MainLayout>
                </RoleRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <MainLayout>
                    <AdminUsersPage />
                  </MainLayout>
                </RoleRoute>
              }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </ClipboardProvider>
    </ProjectProvider>
  );
}

export default App;
