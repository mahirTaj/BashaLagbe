import { useEffect, useState } from 'react';
import { listUsers, setUserRole, blockUser } from '../api/mod';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user } = useAuth();
  const [q, setQ] = useState({ search: '', role: '', blocked: '' });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="container">You do not have access.</div>;
  }

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await listUsers({ ...q, page, limit: 10 });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const changeRole = async (id, role) => {
    await setUserRole(id, role);
    load(data.page);
  };

  const toggleBlock = async (id, isBlocked) => {
    await blockUser(id, !isBlocked);
    load(data.page);
  };

  return (
    <div className="container">
      <h2 style={{ fontWeight: 800 }}>Users</h2>
      <div className="space"></div>

      <div className="card">
        <div className="row">
          <div>
            <label>Search</label>
            <input className="input" placeholder="Name or email" value={q.search} onChange={(e) => setQ(s => ({ ...s, search: e.target.value }))} />
          </div>
          <div>
            <label>Role</label>
            <select className="input" value={q.role} onChange={(e) => setQ(s => ({ ...s, role: e.target.value }))}>
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select className="input" value={q.blocked} onChange={(e) => setQ(s => ({ ...s, blocked: e.target.value }))}>
              <option value="">All</option>
              <option value="true">Blocked</option>
              <option value="false">Active</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" onClick={() => load(1)} disabled={loading}>Filter</button>
          </div>
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && data.items.map(u => (
        <div key={u._id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{u.name} <span style={{ fontSize: 12, color: 'var(--muted)' }}>({u.email})</span></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Role: {u.role} {u.isBlocked ? '• Blocked' : ''}</div>
            </div>
            <div className="row">
              <select className="input" value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
              <button className="btn btn-danger" onClick={() => toggleBlock(u._id, u.isBlocked)}>
                {u.isBlocked ? 'Unblock' : 'Block'}
              </button>
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