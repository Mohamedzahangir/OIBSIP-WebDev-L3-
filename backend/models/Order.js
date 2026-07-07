const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      name: {
        type: String,
        required: true,
      },
      isCustom: {
        type: Boolean,
        default: false,
      },
      base: {
        type: String,
        required: true,
      },
      sauce: {
        type: String,
        required: true,
      },
      cheese: {
        type: String,
        required: true,
      },
      vegetables: [String],
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'],
    default: 'Order Received',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);
