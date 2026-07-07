const express = require('express');
const Inventory = require('../models/Inventory');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Get current inventory levels (Accessible by users to build custom pizzas, and admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await Inventory.find({});
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving inventory', error: error.message });
  }
});

// Update stock manually (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { stock, price, threshold } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (stock !== undefined) item.stock = stock;
    if (price !== undefined) item.price = price;
    if (threshold !== undefined) item.threshold = threshold;

    // Reset email alert trigger if stock is bumped above or equal to threshold
    const stockLimit = threshold !== undefined ? threshold : item.threshold;
    if (item.stock >= stockLimit) {
      item.adminNotified = false;
    }

    await item.save();
    res.json({ message: 'Inventory item updated successfully', item });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating inventory', error: error.message });
  }
});

module.exports = router;
