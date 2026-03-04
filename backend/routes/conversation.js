const express = require('express');
const router = express.Router();
const { processMessage } = require('../controllers/aiController');

router.post('/message', async (req, res) => {
    const { message, history, language, userProfile } = req.body;
    try {
        const response = await processMessage(message, history, language, userProfile);
        res.json(response);
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

module.exports = router;
