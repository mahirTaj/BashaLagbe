import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  return (
    <div className="topbar">
      <div style={{ fontWeight: 800, color: 'var(--cyan-600)' }}>Admin Dashboard</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{user?.name} — {user?.role}</span>
        <button className="btn" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}