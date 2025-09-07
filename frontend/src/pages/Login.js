import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const data = await login(email, password);
      if (!data) return setMessage('Login failed');
      setMessage('Login successful! Welcome, ' + (data.user?.name || ''));
      setTimeout(() => {
        navigate('/profile');
      }, 800);
    } catch (err) {
      // show common message keys
      const serverMsg = err?.response?.data?.msg || err?.response?.data?.message || err?.response?.data?.error;
      // eslint-disable-next-line no-console
      console.error('Login error', err?.response?.data || err.message);
      setMessage(serverMsg || err.message || 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
    // Use absolute backend URL so the browser navigates to the backend OAuth entrypoint
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: 400,
      margin: '50px auto',
      padding: 20,
      border: '1px solid #ddd',
      borderRadius: 6,
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ textAlign: 'center' }}>Login</h2>
      <form onSubmit={handleSubmit} id="loginForm">
        <label style={{ display: 'block', marginTop: 15, fontWeight: 'bold' }}>Email</label>
        <input
          type="email"
          value={email}
          required
          placeholder="you@example.com"
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 6, boxSizing: 'border-box' }}
        />
        <label style={{ display: 'block', marginTop: 15, fontWeight: 'bold' }}>Password</label>
        <input
          type="password"
          value={password}
          required
          placeholder="Your password"
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 6, boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          style={{
            marginTop: 20,
            width: '100%',
            padding: 10,
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            borderRadius: 4
          }}
        >
          Login
        </button>
      </form>
      <button
        id="googleLoginBtn"
        style={{
          backgroundColor: '#4285F4',
          marginTop: 15,
          width: '100%',
          padding: 10,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          borderRadius: 4
        }}
        onClick={handleGoogleLogin}
      >
        Login with Google
      </button>
      {message && (
        <div
          className={message.startsWith('Login successful') ? 'success' : 'message'}
          style={{
            marginTop: 15,
            textAlign: 'center',
            fontWeight: 'bold',
            color: message.startsWith('Login successful') ? 'green' : 'red'
          }}
        >
          {message}
        </div>
      )}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        Don't have an account? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Register here</Link>
      </div>
    </div>
  );
}