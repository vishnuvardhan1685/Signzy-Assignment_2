/**
 * RoutingLogStore — Mongoose-backed implementation.
 * Same interface as before (add, getAll), now async.
 */

const RoutingLog = require('./schemas/RoutingLog');

function formatLog(doc) {
  if (!doc) return undefined;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    timestamp: obj.createdAt,
    ...obj,
  };
}

class RoutingLogStore {
  async add(entry) {
    const log = await RoutingLog.create(entry);
    return formatLog(log);
  }

  async getAll({ capability, limit = 100 } = {}) {
    const query = capability ? { capability } : {};
    const logs = await RoutingLog.find(query).sort({ createdAt: -1 }).limit(limit);
    return logs.map(formatLog);
  }
}

module.exports = new RoutingLogStore();