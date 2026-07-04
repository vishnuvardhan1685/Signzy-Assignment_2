const vendorStore = require('../models/vendorStore');
const metricsStore = require('../models/metricsStore');
const routingLogStore = require('../models/routingLogStore');

const { orderByPriority } = require('./strategies/priority');
const { orderByWeight } = require('./strategies/weighted');
const { orderByLatency } = require('./strategies/lowestLatency');
const { filterEligibleVendors } = require('./strategies/failover');

const { callVendor } = require('../utils/httpCaller');
const { buildEnvelope } = require('../utils/responseEnvelope');

/**
 * Orders eligible vendors according to the requested strategy.
 * Defaults to priority if an unknown/unspecified strategy is given, since
 * that's the safest, most deterministic fallback. `lowest_latency` needs
 * metricsStore, so it's special-cased rather than forcing every strategy
 * function to accept a param most of them don't need.
 */
function orderCandidates(strategy, vendors) {
  if (strategy === 'lowest_latency') return orderByLatency(vendors, metricsStore);
  if (strategy === 'weighted') return orderByWeight(vendors);
  return orderByPriority(vendors); // default, and explicit 'priority'
}

/**
 * Core entry point: given a capability + payload + requirements, picks a
 * vendor, calls it, reactively fails over on failure, and returns the
 * standardized envelope. Every attempt (successful or not) is logged.
 */
async function routeRequest({ capability, payload, requirements = {}, strategy = 'priority', failoverConditions = {} }) {
  const allVendors = await vendorStore.getVendors(capability);
  console.log('allVendors:', allVendors.map(v => v.name));

  if (allVendors.length === 0) {
    return buildEnvelope({
      status: 'FAILED',
      vendor: null,
      routingReason: `No vendors registered for capability: ${capability}`,
      latencyMs: 0,
      data: null,
    });
  }

  const { eligible, exclusions } = filterEligibleVendors(allVendors, metricsStore, {
    requirements,
    failoverConditions,
  });
  console.log('eligible:', eligible.map(v => v.name));

  if (eligible.length === 0) {
    const reason = `All vendors excluded — ${exclusions.map((e) => `${e.name}: ${e.reason}`).join('; ')}`;
    await routingLogStore.add({
      capability,
      vendorSelected: null,
      routingReason: reason,
      status: 'FAILED',
      latencyMs: 0,
    });
    return buildEnvelope({ status: 'FAILED', vendor: null, routingReason: reason, latencyMs: 0, data: null });
  }

  const candidates = orderCandidates(strategy, eligible);
      console.log('candidates:', candidates.map(v => v.name));

  let attemptedNames = [];
  for (let i = 0; i < candidates.length; i++) {
    const vendor = candidates[i];
    const result = await callVendor(vendor, payload);

    metricsStore.recordCall(vendor.id, { latencyMs: result.latencyMs, success: result.success });

    if (result.success) {
      const routingReason = i === 0
        ? `${vendor.name} selected via ${strategy} strategy`
        : `${vendor.name} selected after failover from: ${attemptedNames.join(', ')}`;

      await routingLogStore.add({
        capability,
        vendorSelected: vendor.name,
        routingReason,
        status: 'SUCCESS',
        latencyMs: result.latencyMs,
        cost: vendor.costPerRequest,
      });

      return buildEnvelope({
        status: 'SUCCESS',
        vendor,
        routingReason,
        latencyMs: result.latencyMs,
        data: result.data,
      });
    }

    // reactive failover — this vendor failed despite passing eligibility checks
    metricsStore.recordAvailability(vendor.id, false);
    attemptedNames.push(`${vendor.name} (${result.errorReason})`);
  }

  // every candidate failed
  const failReason = `All eligible vendors failed — ${attemptedNames.join('; ')}`;
  await routingLogStore.add({
    capability,
    vendorSelected: null,
    routingReason: failReason,
    status: 'FAILED',
    latencyMs: 0,
  });

  return buildEnvelope({ status: 'FAILED', vendor: null, routingReason: failReason, latencyMs: 0, data: null });
}

module.exports = { routeRequest };