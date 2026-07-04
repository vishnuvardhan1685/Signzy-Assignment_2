const axios = require('axios');

const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001';

async function explainRouting({ routingReason, vendorUsed, strategy }) {
  try {
    const { data } = await axios.post(`${AI_AGENT_URL}/explain-routing`, {
      routingReason,
      vendorUsed,
      strategy,
    }, { timeout: 5000 });
    return data.explanation;
  } catch (err) {
    // Never let AI-agent downtime break the core routing feature
    return null;
  }
}

async function generateRoutingConfig(prompt) {
  const { data } = await axios.post(`${AI_AGENT_URL}/generate-routing-config`, { prompt }, { timeout: 15000 });
  return data.generatedConfig;
}

module.exports = { explainRouting, generateRoutingConfig };