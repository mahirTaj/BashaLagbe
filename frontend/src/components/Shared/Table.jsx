export default function Table({ columns = [], data = [], empty = 'No data' }) {
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key || c.header}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ color: 'var(--muted)' }}>{empty}</td></tr>
          ) : data.map((row, idx) => (
            <tr key={row.id || row._id || idx}>
              {columns.map((c, i) => (
                <td key={i}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}