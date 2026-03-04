const { processMessage } = require('./controllers/aiController');

(async () => {
    try {
        const history = [
            { role: 'bot', text: 'Namaste! How can I help you today?' },
            { role: 'user', text: 'hello' },
            { role: 'bot', text: 'Hi, I am Mitra. How can I assist you with government schemes today?' }
        ];
        const result = await processMessage("I am a farmer", history);
        console.log("Result:", result.reply);
    } catch (e) {
        console.error("Error:", e);
    }
})();
