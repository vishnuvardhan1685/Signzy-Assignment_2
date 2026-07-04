require('dotenv').config();
const createServer = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 4000;

connectDB()
    .then(() => {
        const app = createServer();
        app.listen(PORT, () => {
            console.log(`Vendor Routing Platform running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
    });
