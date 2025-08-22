import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/listings', label: 'Verify Listings' },
  { to: '/reports', label: 'Reports' },
  { to: '/users', label: 'Users' },
  { to: '/audit', label: 'Audit Log' }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V10z" stroke="#06b6d4" strokeWidth="2" /></svg>
        FlatRent Admin
      </div>
      <nav className="nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'active' : ''}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}