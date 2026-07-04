function orderByLatency(vendors, metricsStore) {
    return [...vendors].sort((a,b) => {
        const aLatency = metricsStore.getSnapshot(a.id).avgLatencyMs;
        const bLatency = metricsStore.getSnapshot(b.id).avgLatencyMs;

        if(aLatency === null && bLatency === null) return 0;
        if(aLatency === null) return 1;
        if(bLatency === null) return -1;

        return aLatency - bLatency;
    })
}

module.exports = { orderByLatency };