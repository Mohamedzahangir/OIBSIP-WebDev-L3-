const mongoose = require('mongoose');

const pizzaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pizza name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price cannot be negative'],
  },
  image: {
    type: String,
    required: [true, 'Image URL/Path is required'],
  },
  recipe: {
    base: {
      type: String, // Matches Inventory item name (e.g., 'Thin Crust')
      required: true,
    },
    sauce: {
      type: String, // Matches Inventory item name (e.g., 'Marinara')
      required: true,
    },
    cheese: {
      type: String, // Matches Inventory item name (e.g., 'Mozzarella')
      required: true,
    },
    vegetables: [
      {
        type: String, // Array of Inventory item names (e.g., ['Tomatoes', 'Onions'])
      }
    ],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Pizza', pizzaSchema);
