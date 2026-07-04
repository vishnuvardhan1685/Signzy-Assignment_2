function filterEligibleVendors(vendors, metricsStore, { requirements = {}, failoverConditions = {} } = {}) {
  const exclusions = [];

  const eligible = vendors.filter((vendor) => {
    const snapshot = metricsStore.getSnapshot(vendor.id);

    if (vendor.status === 'down') {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: 'marked down' });
      return false;
    }

    if (snapshot.available === false) {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: 'unavailable per last known signal' });
      return false;
    }

    if (vendor.rateLimitPerMinute != null && snapshot.callsInLastMinute >= vendor.rateLimitPerMinute) {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: 'rate limit reached' });
      return false;
    }

    const maxLatency = requirements.maxLatencyMs ?? failoverConditions.maxLatencyMs;
    if (maxLatency && snapshot.avgLatencyMs !== null && snapshot.avgLatencyMs > maxLatency) {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: `avg latency ${snapshot.avgLatencyMs}ms crossed threshold ${maxLatency}ms` });
      return false;
    }

    const maxErrorRate = failoverConditions.maxErrorRate;
    if (maxErrorRate !== undefined && snapshot.errorRate > maxErrorRate) {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: `error rate ${snapshot.errorRate} crossed threshold ${maxErrorRate}` });
      return false;
    }

    if (requirements.requiredFeature && !(vendor.supportedFeatures || []).includes(requirements.requiredFeature)) {
      exclusions.push({ vendorId: vendor.id, name: vendor.name, reason: `does not support required feature: ${requirements.requiredFeature}` });
      return false;
    }

    return true;
  });

  return { eligible, exclusions };
}

module.exports = { filterEligibleVendors };
