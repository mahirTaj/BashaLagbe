import { useEffect, useState } from 'react';
import { fetchStats } from '../api/mod';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ flex: '1 1 200px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container">You do not have access.</div>;
  }

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>Admin overview</h2>
      <div className="space"></div>
      {!stats ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="Blocked users" value={stats.blockedUsers} />
          <StatCard label="Pending listings" value={stats.pendingListings} />
          <StatCard label="Published" value={stats.publishedListings} />
          <StatCard label="Rejected" value={stats.rejectedListings} />
          <StatCard label="Open reports" value={stats.openReports} />
          <StatCard label="Resolved reports" value={stats.resolvedReports} />
        </div>
      )}
    </div>
  );
}