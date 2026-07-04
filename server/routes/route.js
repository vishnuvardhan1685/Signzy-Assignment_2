const express = require('express');
const router = express.Router();
const { routeRequest } = require('../services/router');


router.post('/', async (req, res) => {
  const { capability, payload, requirements, strategy, failoverConditions } = req.body;

  if (!capability || !payload) {
    return res.status(400).json({ error: 'capability and payload are required' });
  }

  try {
    const result = await routeRequest({
      capability,
      payload,
      requirements,
      strategy,
      failoverConditions,
    });

    const httpStatus = result.status === 'SUCCESS' ? 200 : 502;
    return res.status(httpStatus).json(result);
  } catch (err) {
    return res.status(500).json({ error: `Failed to route request: ${err.message}` });
  }
});

module.exports = router;
