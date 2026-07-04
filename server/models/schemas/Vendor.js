const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    capability: { type: String, required: true, index: true },
    baseUrl: { type: String, required: true },
    weight: { type: Number, default: 0 },
    priority: { type: Number, default: 999 },
    costPerRequest: { type: Number, default: 0 },
    timeoutMs: { type: Number, default: 2000 },
    // null/undefined = unlimited. NOT Infinity — Mongo/JSON can't store that.
    rateLimitPerMinute: { type: Number, default: null },
    supportedFeatures: { type: [String], default: [] },
    status: { type: String, enum: ['healthy', 'down'], default: 'healthy' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);