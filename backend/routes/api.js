const express = require('express');
const router = express.Router();
const { askQuestion, analyzeImage } = require('../controllers/aiController');

// Question endpoint
router.post('/ask', askQuestion);

// Image analysis endpoint
router.post('/analyze-image', analyzeImage);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ 
        success: true,
        message: '✅ API is working!',
        timestamp: new Date()
    });
});

module.exports = router;
