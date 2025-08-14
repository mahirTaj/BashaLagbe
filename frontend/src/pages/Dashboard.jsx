import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const canModerate = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ fontWeight: 800 }}>Dashboard</h2>
        <div className="space"></div>
        <p>Welcome, <strong>{user?.name}</strong> ({user?.role})</p>
        <div className="space"></div>
        <div className="row">
          {canModerate && <Link className="btn btn-primary" to="/overview">Overview</Link>}
          {canModerate && <Link className="btn btn-primary" to="/moderation">Moderation</Link>}
          {canModerate && <Link className="btn btn-ghost" to="/users">Users</Link>}
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
}