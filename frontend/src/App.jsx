import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import CustomPizzaBuilder from './pages/CustomPizzaBuilder';
import OrderSummary from './pages/OrderSummary';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// User route guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin route guard
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <div className="app-container">
        {/* Responsive Premium Navbar */}
        <header className="header">
          <Link to="/" className="logo">
            <span>🍕</span> PizzaCraft
          </Link>
          <nav>
            <ul className="nav-links">
              {user ? (
                <>
                  {user.role === 'admin' ? (
                    <>
                      <li>
                        <NavLink to="/admin/dashboard" className="nav-link">Dashboard</NavLink>
                      </li>
                      <li className="user-badge">
                        <span className="user-avatar">A</span>
                        <span>{user.name} (Admin)</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <NavLink to="/" className="nav-link" end>Home</NavLink>
                      </li>
                      <li>
                        <NavLink to="/custom-pizza" className="nav-link">Custom Pizza</NavLink>
                      </li>
                      <li className="user-badge">
                        <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                        <span>{user.name}</span>
                      </li>
                    </>
                  )}
                  <li>
                    <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <NavLink to="/login" className="nav-link">Login</NavLink>
                  </li>
                  <li>
                    <NavLink to="/register" className="nav-link">Register</NavLink>
                  </li>
                  <li>
                    <NavLink to="/admin/login" className="nav-link" style={{ color: 'var(--text-muted)' }}>Admin</NavLink>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            {/* User Auth Routes */}
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* User Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/custom-pizza" element={
              <ProtectedRoute>
                <CustomPizzaBuilder />
              </ProtectedRoute>
            } />
            <Route path="/order-summary" element={
              <ProtectedRoute>
                <OrderSummary />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/login" element={!user ? <AdminLogin /> : (user.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />)} />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
