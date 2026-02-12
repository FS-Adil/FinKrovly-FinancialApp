import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Auth/Login';
import MainLayout from './components/Layout/MainLayout';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/UI/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/user" element={<UserPage />} />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              } />
            </Route>
          </Route>
          
          <Route path="/" element={<Navigate to="/user" replace />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;