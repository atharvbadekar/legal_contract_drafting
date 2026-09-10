import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateDocument } from './pages/CreateDocument';
import { DocumentsList } from './pages/DocumentsList';
import { DocumentEditor } from './pages/DocumentEditor';
import { DocumentVersions } from './pages/DocumentVersions';
import { ResearchDashboard } from './pages/ResearchDashboard';
import { AdminTemplates } from './pages/admin/AdminTemplates';
import { AdminClauses } from './pages/admin/AdminClauses';
import { AdminKnowledge } from './pages/admin/AdminKnowledge';
import { AdminAudit } from './pages/admin/AdminAudit';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-xs text-mira-muted">Authenticating workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="p-12 text-center text-xs text-mira-muted">Verifying privileges...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="create" element={<CreateDocument />} />
            <Route path="documents" element={<DocumentsList />} />
            <Route path="documents/:id/edit" element={<DocumentEditor />} />
            <Route path="documents/:id/versions" element={<DocumentVersions />} />
            <Route path="research" element={<ResearchDashboard />} />

            {/* Admin Routes */}
            <Route
              path="admin/templates"
              element={
                <AdminRoute>
                  <AdminTemplates />
                </AdminRoute>
              }
            />
            <Route
              path="admin/clauses"
              element={
                <AdminRoute>
                  <AdminClauses />
                </AdminRoute>
              }
            />
            <Route
              path="admin/knowledge"
              element={
                <AdminRoute>
                  <AdminKnowledge />
                </AdminRoute>
              }
            />
            <Route
              path="admin/audit"
              element={
                <AdminRoute>
                  <AdminAudit />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
