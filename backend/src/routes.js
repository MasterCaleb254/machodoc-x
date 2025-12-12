const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

module.exports = (pool) => {
    // Create a new patient
    router.post('/patients', async (req, res) => {
        try {
            const { basicInfo, anonymousId } = req.body;
            // In a real app, you would insert into the database here
            // const result = await pool.query('INSERT INTO patients ...');
            console.log('Received new patient:', anonymousId);

            res.status(201).json({
                success: true,
                id: 'mock-patient-id-' + Date.now(),
                message: 'Patient created successfully'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Submit diagnostic session
    router.post('/diagnostics', async (req, res) => {
        try {
            const { patientId, panelType, sensorData } = req.body;
            console.log(`Diagnostic session for ${patientId}, panel: ${panelType}`);

            // Mock calling ML service could happen here

            res.status(201).json({
                success: true,
                sessionId: 'session-' + Date.now(),
                status: 'processing'
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Upload sensor data (images/audio)
    router.post('/upload', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log(`File uploaded: ${req.file.originalname} (${req.file.mimetype})`);
        res.json({
            success: true,
            filePath: req.file.path,
            filename: req.file.filename
        });
    });

    return router;
};
