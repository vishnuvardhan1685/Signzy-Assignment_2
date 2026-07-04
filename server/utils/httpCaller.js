const axios = require('axios');

async function callVendor(vendor, payload) {
    const startedAt = Date.now();
    try{
        const response = await axios.post(vendor.baseUrl, { payload }, {
            timeout: vendor.timeoutMs,
        });
        const latencyMs = Date.now() - startedAt;
        const success = response.status >= 200 && response.status < 300;
        return {
            success,
            latencyMs,
            httpStatus: response.status,
            data: response.data,
            errorReason: success ? null : `HTTP ${response.status}`,
        };
    } catch (err) {
        const latencyMs = Date.now() - startedAt;
        const isTimeout = err.code === 'ECONNABORTED';
        return {
            success: false,
            latencyMs,
            httpStatus: null,
            data: null,
            errorReason: isTimeout ? 'Timeout' : (err.message || 'UNKNOWN_ERROR'),
        };
    }
}

module.exports = { callVendor };