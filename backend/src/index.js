const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'machodoc',
    password: process.env.DB_PASSWORD || 'machodoc_dev',
    database: process.env.DB_NAME || 'machodoc',
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Test DB connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Connected to PostgreSQL');
        release();
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes(pool));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'backend', timestamp: new Date() });
});

app.listen(port, () => {
    console.log(`Backend service listening at http://localhost:${port}`);
});
