const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Ingredient type is required'],
    enum: ['base', 'sauce', 'cheese', 'vegetable'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 100,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0,
  },
  threshold: {
    type: Number,
    required: [true, 'Alert threshold is required'],
    min: [0, 'Threshold cannot be negative'],
    default: 20,
  },
  adminNotified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Inventory', inventorySchema);
