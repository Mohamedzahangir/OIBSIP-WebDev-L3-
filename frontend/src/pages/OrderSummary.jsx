import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

function OrderSummary() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [simulatedOrder, setSimulatedOrder] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    const storedItems = sessionStorage.getItem('pizza_checkout_items');
    const storedTotal = sessionStorage.getItem('pizza_checkout_total');

    if (!storedItems || !storedTotal) {
      navigate('/');
      return;
    }

    setItems(JSON.parse(storedItems));
    setTotal(parseFloat(storedTotal));

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [navigate]);

  const handleCheckout = async () => {
    setError('');
    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items, totalAmount: total })
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.message || 'Failed to initialize order.');
      }

      if (orderData.isSimulated) {
        setSimulatedOrder(orderData);
        setShowSimulator(true);
        setLoading(false);
      } else {
        const options = {
          key: orderData.razorpayKeyId || 'rzp_test_placeholder',
          amount: Math.round(total * 100),
          currency: 'INR',
          name: 'PizzaCraft App',
          description: 'Payment for fresh pizza order',
          order_id: orderData.razorpayOrderId,
          handler: async function (rzpResponse) {
            setLoading(true);
            try {
              const verifyRes = await fetch(`${apiUrl}/api/orders/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpayOrderId: rzpResponse.razorpay_order_id,
                  razorpayPaymentId: rzpResponse.razorpay_payment_id,
                  razorpaySignature: rzpResponse.razorpay_signature
                })
              });
              
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.message || 'Payment verification failed.');
              }

              sessionStorage.removeItem('pizza_checkout_items');
              sessionStorage.removeItem('pizza_checkout_total');
              navigate('/');
            } catch (err) {
              setError(err.message || 'Payment validation failed.');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: user.name,
            email: user.email
          },
          theme: {
            color: '#ff5e3a'
          }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
          setLoading(false);
        } else {
          throw new Error('Razorpay Checkout library failed to load. Use simulator instead.');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during checkout.');
      setLoading(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!simulatedOrder) return;
    setLoading(true);
    setShowSimulator(false);

    try {
      const apiUrl = getApiUrl();
      const verifyRes = await fetch(`${apiUrl}/api/orders/mock-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpayOrderId: simulatedOrder.razorpayOrderId
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.message || 'Mock payment confirmation failed.');
      }

      sessionStorage.removeItem('pizza_checkout_items');
      sessionStorage.removeItem('pizza_checkout_total');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Mock payment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '650px' }}>
        <h2 className="auth-title" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
          Order Checkout
        </h2>

        {error && <div className="alert alert-danger">{error}</div>}

        {items.map((item, index) => (
          <div key={index} style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1.2rem', borderRadius: 'var(--border-radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{item.name}</h3>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>₹{item.price * item.quantity}</span>
            </div>
            
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              <div><strong>Crust:</strong> {item.base}</div>
              <div><strong>Sauce:</strong> {item.sauce}</div>
              <div><strong>Cheese:</strong> {item.cheese}</div>
              {item.vegetables.length > 0 && (
                <div><strong>Vegetables:</strong> {item.vegetables.join(', ')}</div>
              )}
            </div>
          </div>
        ))}

        <div style={{ borderTop: '1px dotted var(--text-muted)', paddingTop: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <span>Taxes & Service Fee (5% GST)</span>
            <span>₹{(total * 0.05).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0 1.5rem 0', borderTop: '1px dotted var(--text-muted)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Total Due</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
              ₹{(total * 1.05).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(-1)} disabled={loading}>
            ← Back
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCheckout} disabled={loading}>
            {loading ? 'Processing...' : 'Pay & Confirm Order 💳'}
          </button>
        </div>

        {showSimulator && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', border: '1px solid var(--accent-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Razorpay Test Simulator</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                We detected that Razorpay keys are omitted or set to placeholders in the backend `.env`.
                No problem! We've loaded the <strong>Local Simulator Mode</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={handleSimulatePaymentSuccess} disabled={loading}>
                  {loading ? 'Processing...' : 'Simulate Payment Success ✅'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowSimulator(false)} disabled={loading}>
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default OrderSummary;
