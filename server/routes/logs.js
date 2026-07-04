const express = require('express');
const router = express.Router();
const routingLogStore = require('../models/routingLogStore');


router.get('/', async (req, res) => {
  const { capability, limit } = req.query;
  try {
    const logs = await routingLogStore.getAll({
      capability,
      limit: limit ? Number(limit) : undefined,
    });
    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch routing logs: ${err.message}` });
  }
});

module.exports = router;