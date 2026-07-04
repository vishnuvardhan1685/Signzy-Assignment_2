function buildEnvelope({ status, vendor, routingReason, latencyMs, data }){
    return {
        status: status === 'FAILED' ? 'FAILURE' : status,
        vendorUsed: vendor ? vendor.name : null,
        routingReason,
        latencyMs,
        cost : vendor ? vendor.costPerRequest : null,
        response: data ?? null,
    };
}

module.exports = { buildEnvelope };
