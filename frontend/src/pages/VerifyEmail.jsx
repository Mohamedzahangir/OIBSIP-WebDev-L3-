import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verifyToken = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/auth/verify/${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. Token may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Unable to connect to server.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
        <h2 className="auth-title" style={{ marginBottom: '1.5rem' }}>Email Verification</h2>

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              🎉 {message}
            </div>
            <Link to="/login" className="btn btn-primary">
              Log In to Order
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              ❌ {message}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Please register again or request another reset/verification email.
            </p>
            <Link to="/register" className="btn btn-secondary">
              Back to Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
