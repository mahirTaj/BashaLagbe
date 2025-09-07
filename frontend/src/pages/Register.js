import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!name || !email || !password) {
      setMessage('Please fill all fields.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name, email, password);
      setLoading(false);
      if (data?.token) {
        setMessage('Registration successful! Redirecting...');
        setTimeout(() => navigate('/profile'), 1000);
      } else {
        setMessage('Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setMessage('Error: ' + err.message);
    }
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
      <h2 style={{ textAlign: 'center' }}>Register</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginTop: 15, fontWeight: 'bold' }}>Name</label>
        <input
          type="text"
          value={name}
          required
          placeholder="Your name"
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 6, boxSizing: 'border-box' }}
        />
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
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      {message && (
        <div
          style={{
            marginTop: 15,
            textAlign: 'center',
            fontWeight: 'bold',
            color: message.startsWith('Registration successful') ? 'green' : 'red'
          }}
        >
          {message}
        </div>
      )}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login here</Link>
      </div>
    </div>
  );
}