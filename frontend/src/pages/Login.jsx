import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const slides = [
  { title: 'Quality listings, safe community', body: 'Admins verify new submissions to keep content trustworthy and helpful.' },
  { title: 'Report, review, resolve', body: 'Flagged posts are reviewed quickly. Bad actors are blocked to protect users.' },
  { title: 'Fast, focused moderation', body: 'Approve or reject in one click, with clear audit trails for every action.' }
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: 'superadmin@admin.com', password: 'SuperSecure123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-slider">
        {slides.map((s, i) => (
          <div key={i} className={`slide ${idx === i ? 'active' : ''}`}>
            <div className="slide-content">
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          </div>
        ))}
        <div className="slide-dotbar">
          {slides.map((_, i) => <div key={i} className={`slide-dot ${idx === i ? 'active' : ''}`} />)}
        </div>
      </div>

      <div className="auth-form">
        <div className="auth-card">
          <div className="auth-title">Welcome back</div>
          <div className="auth-sub">Sign in to access the admin dashboard</div>
          <form className="form" onSubmit={onSubmit}>
            <div>
              <label>Email</label>
              <input className="input" name="email" type="email" value={form.email} onChange={onChange} required />
            </div>
            <div>
              <label>Password</label>
              <input className="input" name="password" type="password" value={form.password} onChange={onChange} required />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Login'}
            </button>
          </form>
          <div className="space"></div>
          <button
            className="btn btn-ghost"
            onClick={() => document.documentElement.classList.toggle('dark')}
            type="button"
          >
            Toggle Theme
          </button>
        </div>
      </div>
    </div>
  );
}