import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import { ClipboardProvider } from './contexts/ClipboardContext';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { FileManagerPage } from './pages/FileManagerPage';
import { SettingsPage } from './pages/SettingsPage';

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
                  <ProtectedRoute>
                    <MainLayout>
                      <FileManagerPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SettingsPage />
                    </MainLayout>
                  </ProtectedRoute>
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
