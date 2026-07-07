import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

const BASE_CUSTOM_PRICE = 100;

const vegPositions = {
  Tomatoes: [
    { top: '30%', left: '30%', color: '#c0392b' },
    { top: '40%', left: '70%', color: '#c0392b' },
    { top: '70%', left: '35%', color: '#c0392b' },
    { top: '60%', left: '60%', color: '#c0392b' }
  ],
  Onions: [
    { top: '25%', left: '55%', color: '#e8daef' },
    { top: '65%', left: '25%', color: '#e8daef' },
    { top: '50%', left: '45%', color: '#e8daef' },
    { top: '75%', left: '60%', color: '#e8daef' }
  ],
  Mushrooms: [
    { top: '45%', left: '20%', color: '#d5dbdb' },
    { top: '35%', left: '50%', color: '#d5dbdb' },
    { top: '55%', left: '75%', color: '#d5dbdb' },
    { top: '70%', left: '50%', color: '#d5dbdb' }
  ],
  'Bell Peppers': [
    { top: '20%', left: '40%', color: '#27ae60' },
    { top: '50%', left: '65%', color: '#27ae60' },
    { top: '60%', left: '30%', color: '#27ae60' },
    { top: '80%', left: '45%', color: '#27ae60' }
  ],
  Olives: [
    { top: '35%', left: '35%', color: '#2c3e50' },
    { top: '45%', left: '55%', color: '#2c3e50' },
    { top: '65%', left: '45%', color: '#2c3e50' },
    { top: '55%', left: '25%', color: '#2c3e50' }
  ],
  Jalapenos: [
    { top: '30%', left: '60%', color: '#2ecc71' },
    { top: '50%', left: '35%', color: '#2ecc71' },
    { top: '65%', left: '65%', color: '#2ecc71' }
  ]
};

function CustomPizzaBuilder() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [selectedCheese, setSelectedCheese] = useState(null);
  const [selectedVeggies, setSelectedVeggies] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInventory(data);
          
          const availableBases = data.filter(i => i.type === 'base' && i.stock > 0);
          const availableSauces = data.filter(i => i.type === 'sauce' && i.stock > 0);
          const availableCheeses = data.filter(i => i.type === 'cheese' && i.stock > 0);
          
          if (availableBases.length > 0) setSelectedBase(availableBases[0]);
          if (availableSauces.length > 0) setSelectedSauce(availableSauces[0]);
          if (availableCheeses.length > 0) setSelectedCheese(availableCheeses[0]);
        } else {
          setError('Failed to load ingredients.');
        }
      } catch (err) {
        setError('Network error loading ingredients.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [token]);

  const bases = inventory.filter(i => i.type === 'base');
  const sauces = inventory.filter(i => i.type === 'sauce');
  const cheeses = inventory.filter(i => i.type === 'cheese');
  const vegetables = inventory.filter(i => i.type === 'vegetable');

  const toggleVeggie = (veg) => {
    if (veg.stock <= 0) return;
    if (selectedVeggies.find(v => v._id === veg._id)) {
      setSelectedVeggies(selectedVeggies.filter(v => v._id !== veg._id));
    } else {
      setSelectedVeggies([...selectedVeggies, veg]);
    }
  };

  const calculatePrice = () => {
    let price = BASE_CUSTOM_PRICE;
    if (selectedBase) price += selectedBase.price;
    if (selectedSauce) price += selectedSauce.price;
    if (selectedCheese) price += selectedCheese.price;
    selectedVeggies.forEach(v => {
      price += v.price;
    });
    return price;
  };

  const handleProceedToSummary = () => {
    if (!selectedBase || !selectedSauce || !selectedCheese) {
      setError('Please select a base, sauce, and cheese to continue.');
      return;
    }

    const customPizza = {
      name: 'Custom Pizza',
      isCustom: true,
      base: selectedBase.name,
      sauce: selectedSauce.name,
      cheese: selectedCheese.name,
      vegetables: selectedVeggies.map(v => v.name),
      price: calculatePrice(),
      quantity: 1
    };

    sessionStorage.setItem('pizza_checkout_items', JSON.stringify([customPizza]));
    sessionStorage.setItem('pizza_checkout_total', customPizza.price.toString());
    navigate('/order-summary');
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="builder-layout">
      <div className="pizza-preview-pane">
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Interactive Crust Preview</h2>
        
        <div className="pizza-canvas">
          <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }}>
            {selectedBase ? selectedBase.name : 'Choose Crust'}
          </div>

          <div className={`pizza-sauce-layer ${selectedSauce ? 'has-sauce' : ''}`}></div>

          <div className={`pizza-cheese-layer ${selectedCheese ? 'has-cheese' : ''}`}></div>

          {selectedVeggies.map((veg) => {
            const positions = vegPositions[veg.name] || [];
            return positions.map((pos, idx) => (
              <div
                key={`${veg.name}-${idx}`}
                className="veg-spot"
                style={{
                  top: pos.top,
                  left: pos.left,
                  backgroundColor: pos.color,
                  boxShadow: '1px 1px 2px rgba(0,0,0,0.4)',
                  width: veg.name === 'Tomatoes' ? '18px' : '12px',
                  height: veg.name === 'Tomatoes' ? '18px' : '12px',
                  borderRadius: '50%'
                }}
              />
            ));
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>Subtotal</p>
          <h2 style={{ fontSize: '2.8rem', color: 'var(--accent-secondary)', fontWeight: 800 }}>₹{calculatePrice()}</h2>
        </div>
      </div>

      <div className="builder-steps-container">
        <div className="glass-card">
          <div className="step-indicator">
            <div className={`step-dot ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
            <div className={`step-dot ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
            <div className={`step-dot ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
            <div className={`step-dot ${step === 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>4</div>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            {step === 1 && '🥖 Choose Your Dough'}
            {step === 2 && '🥫 Lather The Sauce'}
            {step === 3 && '🧀 Sprinkle The Cheese'}
            {step === 4 && '🥗 Scatter Fresh Toppings'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {step === 1 && 'Every legendary pizza begins with the perfect crust. Select yours below.'}
            {step === 2 && 'Spread our slow-cooked, seasoned sauce onto your dough.'}
            {step === 3 && 'Select a creamy cheese base that melts perfectly in the deck oven.'}
            {step === 4 && 'Load up with garden-fresh, hand-chopped vegetables.'}
          </p>

          {error && <div className="alert alert-danger">{error}</div>}

          {step === 1 && (
            <div className="ingredient-grid">
              {bases.map((base) => (
                <div
                  key={base._id}
                  className={`ingredient-card ${selectedBase?._id === base._id ? 'selected' : ''} ${base.stock <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => base.stock > 0 && setSelectedBase(base)}
                >
                  <div className="ingredient-name">{base.name}</div>
                  <div className="ingredient-price">+₹{base.price}</div>
                  <span className="ingredient-stock-badge">
                    {base.stock <= 0 ? '❌ Out of Stock' : `✓ Ready to Bake`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="ingredient-grid">
              {sauces.map((sauce) => (
                <div
                  key={sauce._id}
                  className={`ingredient-card ${selectedSauce?._id === sauce._id ? 'selected' : ''} ${sauce.stock <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => sauce.stock > 0 && setSelectedSauce(sauce)}
                >
                  <div className="ingredient-name">{sauce.name}</div>
                  <div className="ingredient-price">+₹{sauce.price}</div>
                  <span className="ingredient-stock-badge">
                    {sauce.stock <= 0 ? '❌ Out of Stock' : `✓ Ready`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="ingredient-grid">
              {cheeses.map((cheese) => (
                <div
                  key={cheese._id}
                  className={`ingredient-card ${selectedCheese?._id === cheese._id ? 'selected' : ''} ${cheese.stock <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => cheese.stock > 0 && setSelectedCheese(cheese)}
                >
                  <div className="ingredient-name">{cheese.name}</div>
                  <div className="ingredient-price">+₹{cheese.price}</div>
                  <span className="ingredient-stock-badge">
                    {cheese.stock <= 0 ? '❌ Out of Stock' : `✓ Ready`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="ingredient-grid">
              {vegetables.map((veg) => {
                const isSelected = selectedVeggies.find(v => v._id === veg._id);
                return (
                  <div
                    key={veg._id}
                    className={`ingredient-card ${isSelected ? 'selected' : ''} ${veg.stock <= 0 ? 'out-of-stock' : ''}`}
                    onClick={() => toggleVeggie(veg)}
                  >
                    <div className="ingredient-name">{veg.name}</div>
                    <div className="ingredient-price">+₹{veg.price}</div>
                    <span className="ingredient-stock-badge">
                      {veg.stock <= 0 ? '❌ Out of Stock' : `✓ Ready`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="builder-controls">
            <button
              className="btn btn-secondary"
              disabled={step === 1}
              onClick={() => setStep(prev => prev - 1)}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(prev => prev + 1)}
              >
                Next Step →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleProceedToSummary}
                style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #d48b00 100%)' }}
              >
                Review Summary 🍽️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomPizzaBuilder;
