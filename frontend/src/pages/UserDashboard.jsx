import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

function UserDashboard() {
  const { token, user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [pizzas, setPizzas] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingPizzas, setLoadingPizzas] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const pizzasRes = await fetch(`${apiUrl}/api/pizzas`);
        if (pizzasRes.ok) {
          const pizzasData = await pizzasRes.json();
          setPizzas(pizzasData);
        }
        setLoadingPizzas(false);

        const ordersRes = await fetch(`${apiUrl}/api/orders/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
        setLoadingOrders(false);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again.');
        setLoadingPizzas(false);
        setLoadingOrders(false);
      }
    };

    fetchData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('order-status', (updatedOrder) => {
      console.log('Received order status update via socket:', updatedOrder);
      setOrders((prevOrders) => {
        const index = prevOrders.findIndex(o => o._id === updatedOrder._id);
        if (index !== -1) {
          const updated = [...prevOrders];
          updated[index] = updatedOrder;
          return updated;
        } else {
          return [updatedOrder, ...prevOrders];
        }
      });
    });

    return () => {
      socket.off('order-status');
    };
  }, [socket]);

  const handleOrderPreMade = (pizza) => {
    const checkoutItem = {
      name: pizza.name,
      isCustom: false,
      base: pizza.recipe.base,
      sauce: pizza.recipe.sauce,
      cheese: pizza.recipe.cheese,
      vegetables: pizza.recipe.vegetables,
      price: pizza.basePrice,
      quantity: 1
    };

    sessionStorage.setItem('pizza_checkout_items', JSON.stringify([checkoutItem]));
    sessionStorage.setItem('pizza_checkout_total', pizza.basePrice.toString());
    navigate('/order-summary');
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'Order Received': return 0;
      case 'In Kitchen': return 1;
      case 'Sent to Delivery': return 2;
      case 'Delivered': return 3;
      default: return 0;
    }
  };

  const activeOrders = orders.filter(o => o.orderStatus !== 'Delivered' && o.paymentStatus === 'paid');
  const pastOrders = orders.filter(o => o.orderStatus === 'Delivered' || o.paymentStatus !== 'paid');

  return (
    <div className="dashboard-grid">
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Welcome back, {user?.name}! 👋</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Explore our varieties or create your own custom masterpiece.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="glass-card builder-cta-card" style={{ marginBottom: '3rem' }}>
          <div className="builder-cta-icon">🍕</div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Custom Pizza Builder</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '2rem' }}>
            Choose your own fresh crust, signature sauces, gourmet cheeses, and premium garden toppings. Crafted exactly how you love it!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/custom-pizza')}>
            Open Pizza Builder Wizard 🛠️
          </button>
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Available Pizza Varieties</h2>

        {loadingPizzas ? (
          <div className="spinner-container"><div className="spinner"></div></div>
        ) : (
          <div className="pizza-list-container">
            {pizzas.map((pizza) => (
              <div key={pizza._id} className="glass-card pizza-card">
                <div className="pizza-image-wrapper">
                  <img src={pizza.image} alt={pizza.name} className="pizza-image" />
                  <span className="pizza-badge">Chef's Choice</span>
                </div>
                <div className="pizza-content">
                  <h3 className="pizza-name">{pizza.name}</h3>
                  <p className="pizza-desc">{pizza.description}</p>
                  <div className="pizza-footer">
                    <span className="pizza-price">₹{pizza.basePrice}</span>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={() => handleOrderPreMade(pizza)}>
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
            🔴 Active Orders Status
          </h2>

          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner" style={{ margin: 'auto' }}></div></div>
          ) : activeOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No active orders. Build one now!</p>
          ) : (
            activeOrders.map((order) => {
              const currentStep = getStatusStep(order.orderStatus);
              return (
                <div key={order._id} className="glass-card order-tracking-card" style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: #{order._id.substring(18)}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>Total: ₹{order.totalAmount}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <strong>Items: </strong> 
                    {order.items.map((item, idx) => `${item.name} x${item.quantity}`).join(', ')}
                  </div>

                  <div className="status-timeline">
                    <div className={`status-node ${currentStep >= 0 ? (currentStep === 0 ? 'active' : 'completed') : ''}`}>
                      <div className="status-indicator">🔔</div>
                      <span className="status-label">Received</span>
                    </div>
                    <div className={`status-node ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : ''}`}>
                      <div className="status-indicator">🍳</div>
                      <span className="status-label">Kitchen</span>
                    </div>
                    <div className={`status-node ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
                      <div className="status-indicator">🛵</div>
                      <span className="status-label">Delivery</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
            🕒 Order History
          </h2>

          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner" style={{ margin: 'auto' }}></div></div>
          ) : pastOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No past orders found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              {pastOrders.map((order) => (
                <div key={order._id} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{order.items.map(i => i.name).join(', ')}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)' }}>₹{order.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span>
                      {order.paymentStatus !== 'paid' ? (
                        <span style={{ color: '#e74c3c' }}>Failed / Pending</span>
                      ) : (
                        <span style={{ color: '#2ecc71' }}>Delivered ✓</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
