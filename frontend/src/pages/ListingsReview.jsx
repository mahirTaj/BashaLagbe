import { useEffect, useState } from 'react';
import api from '../services/api';
import Table from '../components/Shared/Table';

export default function ListingsReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = () => {
    setLoading(true);
    api.get('/admin/listings/pending').then(({ data }) => setRows(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, []);

  const act = async (id, decision) => {
    await api.patch(`/admin/listings/${id}/verify`, { decision });
    fetchRows();
  };

  const columns = [
    { header: 'Title', render: r => <div><div style={{ fontWeight: 700 }}>{r.title}</div><div style={{ color:'var(--muted)', fontSize:12 }}>{r.address}</div></div> },
    { header: 'Price', render: r => `৳ ${r.price}` },
    { header: 'Posted By', render: r => <div>{r.createdBy?.name}<div style={{ color:'var(--muted)', fontSize:12 }}>{r.createdBy?.email}</div></div> },
    { header: 'Status', render: r => <span className="badge pending">{r.status}</span> },
    { header: 'Actions', render: r => (
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn success" onClick={() => act(r._id, 'APPROVE')}>Approve</button>
        <button className="btn danger" onClick={() => act(r._id, 'REJECT')}>Reject</button>
      </div>
    ) }
  ];

  return (
    <div className="container">
      <h3 style={{ marginTop: 0 }}>Verify Listings</h3>
      {loading ? <div className="card">Loading...</div> : <Table columns={columns} data={rows} empty="No pending listings"/>}
    </div>
  );
}