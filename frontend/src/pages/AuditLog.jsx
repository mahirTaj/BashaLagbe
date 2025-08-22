import { useEffect, useState } from 'react';
import api from '../services/api';
import Table from '../components/Shared/Table';

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchRows = (p = 1) => {
    api.get('/admin/audit', { params: { page: p, limit: 10 } })
      .then(({ data }) => { setRows(data.items); setPage(data.page); setPages(data.pages); });
  };

  useEffect(() => { fetchRows(1); }, []);

  const columns = [
    { header: 'Action', render: r => <div style={{ fontWeight: 700 }}>{r.actionType}</div> },
    { header: 'Target', render: r => `${r.targetType} #${r.targetId}` },
    { header: 'By', render: r => <div>{r.actor?.name}<div style={{ color:'var(--muted)', fontSize:12 }}>{r.actor?.email}</div></div> },
    { header: 'When', render: r => new Date(r.createdAt).toLocaleString() }
  ];

  return (
    <div className="container">
      <h3 style={{ marginTop: 0 }}>Audit Log</h3>
      <Table columns={columns} data={rows} empty="No audit items"/>
      <div className="card" style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn" disabled={page<=1} onClick={()=>fetchRows(page-1)}>Prev</button>
        <span style={{ alignSelf:'center' }}>Page {page} / {pages}</span>
        <button className="btn" disabled={page>=pages} onClick={()=>fetchRows(page+1)}>Next</button>
      </div>
    </div>
  );
}