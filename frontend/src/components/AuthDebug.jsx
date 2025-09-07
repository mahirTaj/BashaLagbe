import React from 'react';
import { useAuth } from '../auth';

export default function AuthDebug() {
  const { user, token, loading } = useAuth();
  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, background: '#fff', border: '1px solid #ddd', padding: 8, zIndex: 9999, fontSize: 12 }}>
      <div><strong>Auth Debug</strong></div>
      <div>loading: {String(!!loading)}</div>
      <div>token: {token ? `${token.slice(0,8)}...` : 'null'}</div>
      <div>user: {user ? (user.name || user.email || user.id) : 'null'}</div>
    </div>
  );
}
