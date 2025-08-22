export default function StatCard({ label, value, trend }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {trend ? <div className="trend">{trend}</div> : null}
    </div>
  );
}