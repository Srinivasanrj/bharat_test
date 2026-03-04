const axios = require('axios');
require('dotenv').config();

const test = async () => {
    const SARVAM_API_KEY = process.env.SARVAM_API_KEY || 'sk_v6y4bk3d_ttpab1AA2MLydkOIKb1tEfMv';
    console.log("Using KEY (length):", SARVAM_API_KEY.length);

    try {
        const payload = {
            model: "sarvam-m",
            messages: [
                { role: "system", content: "You are Mitra, a helpful AI assistant." },
                { role: "user", content: "Hello" }
            ],
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1024
        };

        const headers = {
            "Content-Type": "application/json",
            "api-subscription-key": SARVAM_API_KEY
        };

        const response = await axios.post("https://api.sarvam.ai/v1/chat/completions", payload, { headers });
        console.log("Success:", response.data);
    } catch (e) {
        console.error("Error from API:", e?.response?.data || e.message);
    }
};

test();
