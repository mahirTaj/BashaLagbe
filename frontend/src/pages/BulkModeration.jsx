import { useEffect, useState } from 'react';
import { fetchPendingListings, bulkApprove, bulkReject } from '../api/mod';
import { useAuth } from '../context/AuthContext';

export default function BulkModeration() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState([]);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container">You do not have access.</div>;
  }

  useEffect(() => {
    fetchPendingListings().then(({ items }) => setPending(items));
  }, []);

  const toggle = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  };

  const selectAll = () => setSelected(pending.map(p => p._id));
  const clearAll = () => setSelected([]);

  const doApprove = async () => {
    if (selected.length === 0) return alert('Select items first');
    await bulkApprove(selected);
    setPending(prev => prev.filter(p => !selected.includes(p._id)));
    clearAll();
  };

  const doReject = async () => {
    if (selected.length === 0) return alert('Select items first');
    const reason = prompt('Reason for rejection?') || 'Not specified';
    await bulkReject(selected, reason);
    setPending(prev => prev.filter(p => !selected.includes(p._id)));
    clearAll();
  };

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>Bulk moderation</h2>
      <div className="space"></div>
      <div className="row">
        <button className="btn btn-ghost" onClick={selectAll}>Select all</button>
        <button className="btn btn-ghost" onClick={clearAll}>Clear</button>
        <button className="btn btn-primary" onClick={doApprove}>Approve selected</button>
        <button className="btn btn-danger" onClick={doReject}>Reject selected</button>
      </div>
      <div className="space"></div>
      {pending.map(l => (
        <div key={l._id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="row">
              <input type="checkbox" checked={selected.includes(l._id)} onChange={() => toggle(l._id)} />
              <strong>{l.title}</strong>
            </label>
            <div className="badge badge-pending">Pending</div>
          </div>
          <div className="space"></div>
          <p style={{ color: 'var(--muted)' }}>{l.description}</p>
        </div>
      ))}
      {pending.length === 0 && <p>No pending submissions.</p>}
    </div>
  );
}