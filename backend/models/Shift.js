const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD key
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
    totalCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);
