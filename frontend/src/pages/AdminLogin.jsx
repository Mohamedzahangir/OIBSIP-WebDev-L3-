import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Access Denied: Invalid credentials or not an admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card" style={{ borderColor: 'rgba(255, 183, 3, 0.25)' }}>
        <div className="auth-header">
          <span style={{ fontSize: '3rem' }}>🔑</span>
          <h2 className="auth-title" style={{ marginTop: '0.5rem' }}>Admin Portal</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Log in using authorized master credentials</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Authorized Admin Email</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="admin@pizza.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Secure Key Password</label>
            <input
              type="password"
              className="form-control"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #d48b00 100%)', boxShadow: '0 4px 15px rgba(255, 183, 3, 0.25)' }}>
            {loading ? 'Authenticating Admin...' : 'Unlock Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
