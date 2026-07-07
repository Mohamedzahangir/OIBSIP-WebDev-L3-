const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('Razorpay initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Razorpay with env keys:', err);
  }
} else {
  console.log('Razorpay keys missing. Running in payment simulation mode.');
}

async function verifyStock(items) {
  const needed = {};
  for (const item of items) {
    const qty = item.quantity || 1;
    needed[item.base] = (needed[item.base] || 0) + qty;
    needed[item.sauce] = (needed[item.sauce] || 0) + qty;
    needed[item.cheese] = (needed[item.cheese] || 0) + qty;
    
    if (item.vegetables && Array.isArray(item.vegetables)) {
      for (const veg of item.vegetables) {
        needed[veg] = (needed[veg] || 0) + qty;
      }
    }
  }

  const names = Object.keys(needed);
  const stockItems = await Inventory.find({ name: { $in: names } });

  for (const name of names) {
    const required = needed[name];
    const stockItem = stockItems.find(i => i.name === name);
    if (!stockItem || stockItem.stock < required) {
      throw new Error(`Insufficient stock for: ${name} (Needed: ${required}, Available: ${stockItem ? stockItem.stock : 0})`);
    }
  }
  return needed;
}

async function decrementStock(needed) {
  for (const [name, qty] of Object.entries(needed)) {
    await Inventory.updateOne(
      { name },
      { $inc: { stock: -qty } }
    );
  }
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    let neededIngredients;
    try {
      neededIngredients = await verifyStock(items);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString('hex')}`;
    
    if (razorpay) {
      try {
        const options = {
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          receipt: `receipt_${Date.now()}`
        };
        const rzpOrder = await razorpay.orders.create(options);
        razorpayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.error('Razorpay order creation failed, falling back to mock:', rzpErr);
      }
    }

    const order = new Order({
      user: req.user.id,
      items,
      totalAmount,
      razorpayOrderId,
      paymentStatus: 'pending',
      orderStatus: 'Order Received'
    });

    await order.save();

    res.status(201).json({
      orderId: order._id,
      razorpayOrderId,
      totalAmount,
      isSimulated: !razorpay,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating order', error: error.message });
  }
});

router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Payment verification parameters missing' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'fallback_secret');
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature. Transaction tampering detected.' });
    }

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ message: 'Order already paid', order });
    }

    let neededIngredients;
    try {
      neededIngredients = await verifyStock(order.items);
    } catch (err) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Items sold out during checkout: ' + err.message });
    }

    await decrementStock(neededIngredients);

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    await order.save();

    if (req.io) {
      req.io.to(order.user.toString()).emit('order-status', order);
      req.io.emit('admin-new-order', order);
    }

    res.json({ message: 'Payment verified and order confirmed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error verifying payment', error: error.message });
  }
});

router.post('/mock-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;

    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ message: 'Order already paid', order });
    }

    let neededIngredients;
    try {
      neededIngredients = await verifyStock(order.items);
    } catch (err) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Ingredients went out of stock: ' + err.message });
    }

    await decrementStock(neededIngredients);

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = `mock_pay_${crypto.randomBytes(8).toString('hex')}`;
    order.razorpaySignature = 'mock_signature_verified';
    await order.save();

    if (req.io) {
      req.io.to(order.user.toString()).emit('order-status', order);
      req.io.emit('admin-new-order', order);
    }

    res.json({ message: 'Simulated payment succeeded, order confirmed.', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error in mock payment simulator', error: error.message });
  }
});

router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving your orders', error: error.message });
  }
});

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving all orders', error: error.message });
  }
});

router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status transition' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = status;
    await order.save();

    if (req.io) {
      req.io.to(order.user.toString()).emit('order-status', order);
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating order status', error: error.message });
  }
});

module.exports = router;
