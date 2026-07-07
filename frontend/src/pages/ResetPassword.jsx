import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const token = searchParams.get('token');
    if (!token) {
      setError('Password reset token is missing.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password has been reset successfully!');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to reset password. Link may have expired.');
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
          <h2 className="auth-title">Reset Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your new secure password below</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              🎉 {message}
            </div>
            <Link to="/login" className="btn btn-primary btn-block">
              Log In
            </Link>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Resetting password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
