import { useEffect, useState } from 'react';
import api from '../services/api';
import StatCard from '../components/Shared/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState({ pendingListings: 0, openReports: 0, activeUsers: 0, blockedUsers: 0 });

  useEffect(() => {
    api.get('/admin/overview').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="grid cols-4">
        <StatCard label="Pending Listings" value={stats.pendingListings} />
        <StatCard label="Open Reports" value={stats.openReports} />
        <StatCard label="Active Users" value={stats.activeUsers} />
        <StatCard label="Blocked Users" value={stats.blockedUsers} />
      </div>
    </div>
  );
}