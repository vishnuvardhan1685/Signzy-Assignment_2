const express = require('express');
const router = express.Router();
const { generateRoutingConfig, explainRouting } = require('../services/aiAgentClient');

router.post('/generate-routing-config', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const config = await generateRoutingConfig(prompt);
    res.status(200).json({ generatedConfig: config });
  } catch (err) {
    res.status(502).json({ error: 'AI agent unavailable or failed to generate config' });
  }
});

router.post('/explain-routing', async (req, res) => {
  const { routingReason, vendorUsed, strategy } = req.body;
  if (!routingReason) return res.status(400).json({ error: 'routingReason is required' });

  const explanation = await explainRouting({ routingReason, vendorUsed, strategy });
  res.status(200).json({ explanation: explanation || routingReason });
});

module.exports = router;