import { useEffect, useState } from 'react';
import { getHealth } from '../api/mod';
import { useAuth } from '../context/AuthContext';

export default function SystemHealth() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container">You do not have access.</div>;
  }

  useEffect(() => {
    getHealth().then(setStats);
  }, []);

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>System health</h2>
      <div className="space"></div>
      {!stats ? (
        <p>Loading...</p>
      ) : (
        <div className="card">
          <div>Node: <strong>{stats.node}</strong></div>
          <div>Mongo: <strong>{stats.mongo}</strong></div>
          <div>Uptime: <strong>{stats.uptimeSeconds}s</strong></div>
          <div>Time: <strong>{new Date(stats.time).toLocaleString()}</strong></div>
        </div>
      )}
    </div>
  );
}