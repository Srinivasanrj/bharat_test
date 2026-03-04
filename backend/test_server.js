const axios = require('axios');

(async () => {
    try {
        const payload = {
            message: "hello",
            history: [{ "role": "bot", "text": "Namaste! How can I help you today?" }],
            language: "en",
            userProfile: {}
        };
        const res = await axios.post('http://localhost:5000/api/conversation/message', payload);
        console.log(res.data);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
})();
