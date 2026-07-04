const express = require('express');
const router = express.Router();

function makeMockVendor(vendorLabel){
    return async (req,res) => {
        const { latencyMs = 0, failRate = 0, down = 'false' } = req.query;
        const delay = Number(latencyMs) || 0;
        if(delay > 0){
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if(down === 'true' || Math.random() < Number(failRate)){
            return res.status(503).json({
                error: `Vendor ${vendorLabel} is currently unavailable`,
            });
        }
        const { panNumber, name } = req.body?.payload || req.body || {};
        return res.status(200).json({
            panStatus: panNumber ? 'VALID' : 'UNKNOWN',
            nameMatch: Boolean(name),
            verifiedBy: vendorLabel,
        });
    }
}

router.post('/vendor-a/verify', makeMockVendor('Vendor A'));
router.post('/vendor-b/verify', makeMockVendor('Vendor B'));
router.post('/vendor-c/verify', makeMockVendor('Vendor C'));

module.exports = router;