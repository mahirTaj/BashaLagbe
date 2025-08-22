import { useEffect, useState } from 'react';
import api from '../services/api';
import Table from '../components/Shared/Table';

export default function Reports() {
  const [status, setStatus] = useState('OPEN');
  const [rows, setRows] = useState([]);

  const fetchRows = () => {
    api.get('/admin/reports', { params: { status } }).then(({ data }) => setRows(data));
  };

  useEffect(() => { fetchRows(); }, [status]);

  const resolve = async (id) => {
    await api.patch(`/admin/reports/${id}/resolve`, { notes: 'Reviewed and resolved.' });
    fetchRows();
  };

  const columns = [
    { header: 'Listing', render: r => <div><div style={{ fontWeight: 700 }}>{r.listing?.title}</div><div className={`badge ${r.listing?.status?.toLowerCase()}`}>{r.listing?.status}</div></div> },
    { header: 'Reason', render: r => r.reason },
    { header: 'Reporter', render: r => <div>{r.reporter?.name || 'Anonymous'}<div style={{ color:'var(--muted)', fontSize:12 }}>{r.reporter?.email}</div></div> },
    { header: 'Status', render: r => <span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span> },
    { header: 'Actions', render: r => r.status === 'OPEN' ? <button className="btn primary" onClick={() => resolve(r._id)}>Resolve</button> : <span style={{ color: 'var(--muted)' }}>—</span> }
  ];

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12, display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--cyan-600)' }}>Reports</div>
        <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
      <Table columns={columns} data={rows} empty="No reports"/>
    </div>
  );
}