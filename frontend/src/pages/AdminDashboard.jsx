import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

function AdminDashboard() {
  const { token } = useAuth();
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [editingStockId, setEditingStockId] = useState(null);
  const [tempStockValue, setTempStockValue] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const ordersRes = await fetch(`${apiUrl}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      const inventoryRes = await fetch(`${apiUrl}/api/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData);
      }
    } catch (err) {
      setError('Error loading administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('admin-new-order', (newOrder) => {
      console.log('Admin received new order notification via socket:', newOrder);
      setOrders(prev => [newOrder, ...prev]);
      
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioContext.currentTime);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
      } catch (err) {
        console.warn('Audio chime blocked by browser settings.');
      }
    });

    return () => {
      socket.off('admin-new-order');
    };
  }, [socket]);

  const handleStatusChange = async (orderId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update order status.');
      }

      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
      setSuccess(`Order #${orderId.substring(18)} status transitioned to: ${newStatus}`);
    } catch (err) {
      setError(err.message || 'Error occurred.');
    }
  };

  const handleUpdateStock = async (itemId) => {
    setError('');
    setSuccess('');
    const parsedStock = parseInt(tempStockValue);

    if (isNaN(parsedStock) || parsedStock < 0) {
      setError('Please input a valid stock number (0 or positive).');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock: parsedStock })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update stock.');
      }

      setInventory(prev => prev.map(i => i._id === itemId ? data.item : i));
      setEditingStockId(null);
      setTempStockValue('');
      setSuccess(`Successfully updated stock for ${data.item.name}!`);
    } catch (err) {
      setError(err.message || 'Error updating stock level.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <div className="dashboard-title-row">
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)' }}>Admin Control Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage live orders, monitor ingredient stock, and handle replenishment.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          🔄 Refresh Data
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-tab-container">
        <button
          className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📝 Live Orders ({orders.filter(o => o.orderStatus !== 'Delivered' && o.paymentStatus === 'paid').length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Stock & Inventory ({inventory.filter(i => i.stock < i.threshold).length} Low)
        </button>
      </div>

      {loading ? (
        <div className="spinner-container"><div className="spinner"></div></div>
      ) : activeTab === 'orders' ? (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No customer orders placed yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items Ordered</th>
                  <th>Total Cost</th>
                  <th>Payment</th>
                  <th>Time Stamp</th>
                  <th>Update Order Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>#{order._id.substring(18)}</td>
                    <td>
                      <div><strong>{order.user?.name || 'Guest'}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.user?.email || ''}</div>
                    </td>
                    <td>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          <strong>{item.name}</strong> x{item.quantity}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({item.base}, {item.sauce}, {item.cheese}
                            {item.vegetables.length > 0 ? `, [${item.vegetables.join(', ')}]` : ''})
                          </div>
                        </div>
                      ))}
                    </td>
                    <td style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>₹{order.totalAmount}</td>
                    <td>
                      <span className={`badge-status ${order.paymentStatus === 'paid' ? 'delivered' : 'received'}`}>
                        {order.paymentStatus === 'paid' ? 'Paid ✓' : 'Pending ⏳'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {order.paymentStatus !== 'paid' ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Awaiting Payment</span>
                      ) : (
                        <select
                          className="status-dropdown"
                          value={order.orderStatus}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        >
                          <option value="Order Received">Order Received</option>
                          <option value="In Kitchen">In Kitchen</option>
                          <option value="Sent to Delivery">Sent to Delivery</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ingredient Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Base Price</th>
                <th>Alert Threshold</th>
                <th>Status</th>
                <th>Manual Adjust</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.stock < item.threshold;
                return (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{item.type}</td>
                    <td>
                      {editingStockId === item._id ? (
                        <div className="stock-input-group">
                          <input
                            type="number"
                            className="stock-input"
                            value={tempStockValue}
                            onChange={(e) => setTempStockValue(e.target.value)}
                            min={0}
                          />
                          <button className="btn btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleUpdateStock(item._id)}>
                            Save
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setEditingStockId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.stock} units</span>
                      )}
                    </td>
                    <td>₹{item.price}</td>
                    <td>{item.threshold} units</td>
                    <td>
                      {isLow ? (
                        <span className="stock-warning">⚠️ LOW STOCK</span>
                      ) : (
                        <span style={{ color: '#2ecc71', fontWeight: '500' }}>✓ Satisfactory</span>
                      )}
                    </td>
                    <td>
                      {editingStockId !== item._id && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            setEditingStockId(item._id);
                            setTempStockValue(item.stock.toString());
                          }}
                        >
                          ✏️ Edit Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
