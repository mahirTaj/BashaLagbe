import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Moderation from './pages/Moderation.jsx';
import AdminOverview from './pages/AdminOverview.jsx';

import AuditLogs from './pages/AuditLogs.jsx';
import BulkModeration from './pages/BulkModeration.jsx';
import SystemHealth from './pages/SystemHealth.jsx';

function NavBar() {
  const { user, logout } = useAuth();
  const canModerate = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <div className="brand">Admin Panel</div>
        <div className="nav-links">
          {user && <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>}
          {canModerate && (
            <>
              <NavLink to="/overview" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Overview</NavLink>
              <NavLink to="/moderation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Moderation</NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Users</NavLink>
              <NavLink to="/logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Logs</NavLink>
              <NavLink to="/bulk" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Bulk</NavLink>
              <NavLink to="/system" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>System</NavLink>
            </>
          )}
        </div>
        <div className="nav-links">
          <button className="btn-ghost-navbar" onClick={() => document.documentElement.classList.toggle('dark')}>
            Toggle Theme
          </button>
          {user ? (
            <button className="btn-ghost-navbar" onClick={logout}>Logout</button>
          ) : (
            <NavLink to="/login" className="nav-link">Login</NavLink>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavBar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/moderation" element={
            <ProtectedRoute>
              <Moderation />
            </ProtectedRoute>
          } />
          <Route path="/overview" element={
            <ProtectedRoute>
              <AdminOverview />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
             
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          } />
          <Route path="/bulk" element={
            <ProtectedRoute>
              <BulkModeration />
            </ProtectedRoute>
          } />
          <Route path="/system" element={
            <ProtectedRoute>
              <SystemHealth />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}