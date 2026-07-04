const express = require('express');
const router = express.Router();
const vendorStore = require('../models/vendorStore');

const REQUIRED_FIELDS = ['name', 'capability', 'baseUrl'];

router.post('/', async (req, res) => {
  const body = req.body;

  const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
  if (missing.length) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  try {
    const vendor = await vendorStore.addVendor({
      name: body.name,
      capability: body.capability,
      baseUrl: body.baseUrl,
      weight: body.weight ?? 0,
      priority: body.priority ?? 999,
      costPerRequest: body.costPerRequest ?? 0,
      timeoutMs: body.timeoutMs ?? 2000,
      // null = unlimited. Mongo/JSON can't represent Infinity, so this
      // replaces the old in-memory default of `Infinity`.
      rateLimitPerMinute: body.rateLimitPerMinute ?? null,
      supportedFeatures: body.supportedFeatures ?? [],
    });

    return res.status(201).json(vendor);
  } catch (err) {
    return res.status(500).json({ error: `Failed to register vendor: ${err.message}` });
  }
});


router.get('/', async (req, res) => {
  const { capability } = req.query;
  try {
    const vendors = await vendorStore.getVendors(capability);
    return res.status(200).json({ count: vendors.length, vendors });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch vendors: ${err.message}` });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const allowedFields = ['baseUrl', 'status', 'weight', 'priority', 'costPerRequest', 'timeoutMs', 'rateLimitPerMinute'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update' });
  }

  try {
    const vendor = await vendorStore.updateVendor(id, updates);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.status(200).json(vendor);
  } catch (err) {
    return res.status(500).json({ error: `Failed to update vendor: ${err.message}` });
  }
});

module.exports = router;
