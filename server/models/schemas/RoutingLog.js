const mongoose = require('mongoose');

const routingLogSchema = new mongoose.Schema(
  {
    capability: { type: String, required: true, index: true },
    vendorSelected: { type: String, default: null },
    routingReason: { type: String, default: '' },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    latencyMs: { type: Number, default: 0 },
    cost: { type: Number, default: null },
  },
  { timestamps: true } // createdAt doubles as the log's timestamp
);

module.exports = mongoose.model('RoutingLog', routingLogSchema);