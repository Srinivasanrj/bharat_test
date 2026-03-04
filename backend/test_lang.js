const { processMessage } = require('./controllers/aiController');

(async () => {
    try {
        const history = [];
        const result = await processMessage("namaste", history, "hi", {});
        console.log("Result in Hindi:", result.reply);

        const resultTa = await processMessage("vanakkam", history, "ta", {});
        console.log("Result in Tamil:", resultTa.reply);
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
