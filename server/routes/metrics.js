const express = require('express');
const router = express.Router();
const vendorStore = require('../models/vendorStore');
const metricsStore = require('../models/metricsStore');


router.get('/', async (req, res) => {
  const { capability } = req.query;
  try {
    const vendors = await vendorStore.getVendors(capability);

    const metrics = vendors.map((vendor) => ({
      vendorName: vendor.name,
      capability: vendor.capability,
      ...metricsStore.getSnapshot(vendor.id),
    }));

    return res.status(200).json({ count: metrics.length, metrics });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch metrics: ${err.message}` });
  }
});

module.exports = router;