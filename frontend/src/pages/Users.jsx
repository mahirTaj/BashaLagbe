import { useEffect, useState } from 'react';
import api from '../services/api';
import Table from '../components/Shared/Table';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  const fetchRows = () => {
    api.get('/admin/users', { params: { search, role, status } }).then(({ data }) => setRows(data));
  };

  useEffect(() => { fetchRows(); }, []);

  const block = async (id) => { await api.patch(`/admin/users/${id}/block`); fetchRows(); };
  const unblock = async (id) => { await api.patch(`/admin/users/${id}/unblock`); fetchRows(); };

  const columns = [
    { header: 'Name', render: r => <div><div style={{ fontWeight: 700 }}>{r.name}</div><div style={{ color:'var(--muted)', fontSize:12 }}>{r.email}</div></div> },
    { header: 'Role', render: r => <span className="badge">{r.role}</span> },
    { header: 'Status', render: r => <span className={`badge ${r.status === 'ACTIVE' ? 'published' : 'rejected'}`}>{r.status}</span> },
    { header: 'Actions', render: r => {
      const isSelf = user?.id === r._id;
      if (user?.role !== 'SUPER_ADMIN') return <span style={{ color: 'var(--muted)' }}>—</span>;
      return r.status === 'ACTIVE'
        ? <button className="btn danger" disabled={isSelf} onClick={() => block(r._id)}>{isSelf ? 'Cannot Block Self' : 'Block'}</button>
        : <button className="btn success" onClick={() => unblock(r._id)}>Unblock</button>;
    } }
  ];

  return (
    <div className="container">
      <div className="card" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom: 12 }}>
        <input className="input" placeholder="Search name or email" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
        <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
        <button className="btn primary" onClick={fetchRows}>Filter</button>
      </div>
      <Table columns={columns} data={rows} empty="No users"/>
    </div>
  );
}