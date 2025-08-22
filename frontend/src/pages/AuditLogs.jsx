import { useEffect, useState } from 'react';
import { fetchLogs } from '../api/mod';
import { useAuth } from '../context/AuthContext';

export default function AuditLogs() {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container">You do not have access.</div>;
  }

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchLogs({ page, limit: 20 });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>Audit logs</h2>
      <div className="space"></div>
      {loading && <p>Loading...</p>}
      {!loading && data.items.map((log) => (
        <div key={log._id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{log.action}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Target: {log.targetType} • {log.targetId}
                {log.meta && ' • '}{log.meta?.reason || log.meta?.action || ''}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              By: {log.actor?.email} • {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}

      {!loading && data.pages > 1 && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Prev</button>
          <div style={{ padding: '0 8px' }}>Page {data.page} of {data.pages}</div>
          <button className="btn btn-ghost" disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}