import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/theme.css';

// Robust Animated text
function AnimatedText() {
  const messages = [
    'Welcome Back, Admin',
    'Manage Listings with Ease',
    'Keep the Community Safe'
  ];

  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [fade, setFade] = useState(true);
  const timers = useRef([]);

  useEffect(() => {
    // cleanup
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];

    setDisplay('');
    setFade(true);
    const text = messages[index];
    let charIndex = 0;

    const type = () => {
      setDisplay(text.slice(0, charIndex + 1));
      charIndex++;
      if (charIndex < text.length) {
        timers.current.push(setTimeout(type, 80));
      } else {
        timers.current.push(setTimeout(() => {
          setFade(false);
          timers.current.push(setTimeout(() => {
            setIndex((index + 1) % messages.length);
          }, 500));
        }, 1500));
      }
    };

    timers.current.push(setTimeout(type, 100));

    return () => {
      timers.current.forEach(t => clearTimeout(t));
      timers.current = [];
    };
  }, [index]);

  return (
    <h1
      style={{
        fontSize: '2rem',
        textAlign: 'center',
        maxWidth: '400px',
        opacity: fade ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out'
      }}
    >
      {display}
      <span style={{ borderRight: '2px solid white', marginLeft: '2px' }} />
    </h1>
  );
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('fardin@admin.com');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/');
    } catch {
      setErr('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      {/* Left side: animated text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #06b6d4, #e0faff)',
        color: 'white',
        padding: '2rem'
      }}>
        <AnimatedText />
      </div>

      {/* Right side: unchanged login form */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-alt)'
      }}>
        <form onSubmit={onSubmit} style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(10px)',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow)',
          width: '100%',
          maxWidth: '360px',
          display: 'grid',
          gap: '1rem'
        }}>
          <h2 style={{ color: 'var(--cyan-600)', margin: 0 }}>Admin Login</h2>
          <div>
            <input
              className="input"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <input
              className="input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 14 }}>{err}</div>}
          <button className="btn primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}