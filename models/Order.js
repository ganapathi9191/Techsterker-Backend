const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  transactionId: { type: String,  },
  userId: { type: String  },
  amount: { type: Number, }, // Total amount after GST
  advancePayment: { type: Number, }, // Advance payment
  remainingPayment: { type: Number,  }, // Remaining payment after deducting advance
  paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Paid'], default: 'Pending' },
  razorpayOrderId: { type: String, }, // Razorpay order ID
  coursePrice: { type: Number,  }, // Course price
  gst: { type: Number, }, // GST (5% of course price)
  totalAmount: { type: Number,}, // Total amount including GST
});

module.exports = mongoose.model('Order', orderSchema);
