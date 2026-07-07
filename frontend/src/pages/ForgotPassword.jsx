import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [etherealUrl, setEtherealUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setEtherealUrl('');
    setLoading(false);

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'If that email is registered, a password reset link has been sent.');
        if (data.previewUrl) {
          setEtherealUrl(data.previewUrl);
        }
      } else {
        setError(data.message || 'Failed to send password reset email.');
      }
    } catch (err) {
      setError('Network error. Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Forgot Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your email and we'll send you a password reset link</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {etherealUrl && (
          <div className="alert alert-warning" style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>🔧 Local Mail Testing Link:</p>
            <a href={etherealUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              Open Reset Password Email 📬
            </a>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                required
                placeholder="e.g. user@pizzaapp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.95rem', fontWeight: '600' }}>Back to Log In</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
