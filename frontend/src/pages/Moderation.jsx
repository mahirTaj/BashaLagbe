import { useEffect, useState } from 'react';
import {
  fetchPendingListings, approveListing, rejectListing,
  fetchReports, resolveReport, blockUser
} from '../api/mod';
import { useAuth } from '../context/AuthContext';

export default function Moderation() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const { items } = await fetchPendingListings();
        setPending(items);
      } else {
        const { items } = await fetchReports();
        setReports(items);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const onApprove = async (id) => {
    await approveListing(id);
    setPending(prev => prev.filter(l => l._id !== id));
  };

  const onReject = async (id) => {
    const reason = prompt('Reason for rejection?') || 'Not specified';
    await rejectListing(id, reason);
    setPending(prev => prev.filter(l => l._id !== id));
  };

  const onResolve = async (id, action) => {
    await resolveReport(id, action);
    setReports(prev => prev.filter(r => r._id !== id));
  };

  const onBlock = async (uid) => {
    await blockUser(uid, true);
    alert('User blocked');
  };

  const restricted = !user || (user.role !== 'admin' && user.role !== 'superadmin');
  if (restricted) return <div className="container">You do not have access to moderation.</div>;

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>Moderation</h2>

      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending submissions</button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reported listings</button>
      </div>

      {loading && <p>Loading...</p>}

      {tab === 'pending' && !loading && (
        <div className="grid-2">
          {pending.length === 0 && <p>No pending submissions.</p>}
          {pending.map(l => (
            <div key={l._id} className="card">
              <h3 style={{ fontWeight: 700 }}>{l.title}</h3>
              <div className="space"></div>
              <p style={{ color: 'var(--muted)' }}>{l.description}</p>
              <div className="space"></div>
              <div className="badge badge-pending">Pending</div>
              <div className="space"></div>
              <div className="row">
                <button className="btn btn-primary" onClick={() => onApprove(l._id)}>Approve</button>
                <button className="btn btn-danger" onClick={() => onReject(l._id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && !loading && (
        <div>
          {reports.length === 0 && <p>No reports found.</p>}
          {reports.map(r => (
            <div key={r._id} className="card">
              <h3 style={{ fontWeight: 700 }}>{r.listing?.title || 'Listing'}</h3>
              <div className="space"></div>
              <p><strong>Reason:</strong> {r.reason}</p>
              {r.details && <p style={{ color: 'var(--muted)' }}>{r.details}</p>}
              <div className="space"></div>
              <div className="badge badge-reported">Reported</div>
              <div className="space"></div>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => onResolve(r._id, 'none')}>Mark Resolved</button>
                <button className="btn btn-warning" onClick={() => onResolve(r._id, 'unpublish')}>Unpublish</button>
                <button className="btn btn-danger" onClick={() => onBlock(r.listing?.owner)}>Block Owner</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}