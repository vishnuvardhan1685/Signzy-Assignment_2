const ROLLING_WINDOW_SIZE = 30;

class MetricsStore {
    constructor() {
        this.metrics = new Map();
    }

    _ensure(vendorId){
        if(!this.metrics.has(vendorId)){
            this.metrics.set(vendorId, {
                latencies: [],
                successCount: 0,
                errorCount: 0,
                lastCallAt: null,
                rateLimitWindow: [],
                available: true,
            });
        }
        return this.metrics.get(vendorId);
    }

    recordCall(vendorId, { latencyMs, success }) {
        const m = this._ensure(vendorId);
        m.latencies.push(latencyMs);
        if (m.latencies.length > ROLLING_WINDOW_SIZE) {
            m.latencies.shift();
        }
        if(success) m.successCount += 1;
        else m.errorCount += 1;
        m.lastCallAt = new Date().toISOString();
        m.rateLimitWindow.push(Date.now());
        this._pruneRateLimitWindow(m);
    }

    recordAvailability(vendorId, available) {
        const m = this._ensure(vendorId);
        m.available = available;
    }

    _pruneRateLimitWindow(m){
        const cutoff = Date.now() - 60_000; // 1 minute
        m.rateLimitWindow = m.rateLimitWindow.filter(ts => ts >= cutoff);
    }

    getCallsInLastMinute(vendorId){
        const m = this._ensure(vendorId);
        this._pruneRateLimitWindow(m);
        return m.rateLimitWindow.length;
    }

    getSnapshot(vendorId) {
        const m = this._ensure(vendorId);
        const totalCalls = m.successCount + m.errorCount;
        const avgLatencyMs = m.latencies.length 
            ? Math.round(m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length) : null;

        const errorRate = totalCalls ? m.errorCount / totalCalls : 0;
        const successRate = totalCalls ? m.successCount / totalCalls : 1; // optimistic default to 1 if no calls yet

        return {
            vendorId,
            avgLatencyMs,
            successRate : Number(successRate.toFixed(2)),
            errorRate : Number(errorRate.toFixed(2)),
            totalCalls,
            lastCallAt : m.lastCallAt,
            callsInLastMinute: this.getCallsInLastMinute(vendorId),
            available: m.available,
        };
    }

    getSnapShot(vendorId) {
        return this.getSnapshot(vendorId);
    }

    getAllSnapshots(){
        return Array.from(this.metrics.keys()).map((id) => this.getSnapshot(id));
    }
}

module.exports = new MetricsStore();
