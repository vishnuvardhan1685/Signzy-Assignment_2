const express = require('express');
const cors = require('cors');

const vendorRoutes = require('./routes/vendors');
const mockVendorRoutes = require('./mocks/mockVendors');
const routeRoutes = require('./routes/route');
const metricsRoutes = require('./routes/metrics');
const logRoutes = require('./routes/logs');
const aiAgentRoutes = require('./routes/aiAgent');

const createServer = () => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req,res) => {
        res.status(200).json({ status: 'ok', service: 'vendor-routing-service' });
    });

    app.use('/vendors', vendorRoutes);
    app.use('/mocks', mockVendorRoutes);
    app.use('/route', routeRoutes);
    app.use('/vendor-metrics', metricsRoutes);
    app.use('/routing-logs', logRoutes);
    app.use('/ai', aiAgentRoutes);

    return app;
}

module.exports = createServer;
