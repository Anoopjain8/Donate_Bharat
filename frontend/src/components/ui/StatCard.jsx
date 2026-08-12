export default function StatCard({ label, value, hint, icon }) {
  return (
    <div className="stat stat-card">
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
