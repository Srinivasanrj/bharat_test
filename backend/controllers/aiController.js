const axios = require('axios');
const { loadSchemesCache, searchSchemes } = require('../utils/schemeSearch');

// Load cache when controller initialized
loadSchemesCache();

// Ensure the API key is passed correctly, or handle it gracefully if missing
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || 'sk_v6y4bk3d_ttpab1AA2MLydkOIKb1tEfMv';

const processMessage = async (message, history, language = 'en', userProfile = {}) => {
    let extractedInfo = { ...userProfile };
    const msg = message.toLowerCase();

    // Check for Document Appointment intent
    let isAppointmentIntent = false;
    if ((msg.includes('appointment') || msg.includes('book')) && (msg.includes('change') || msg.includes('update') || msg.includes('document') || msg.includes('aadhar') || msg.includes('aadhaar'))) {
        isAppointmentIntent = true;
    }

    // Basic heuristic extraction (Optional: can also be done via LLM)
    if (msg.includes('year') || msg.includes('old')) {
        const age = msg.match(/\d+/);
        if (age) extractedInfo.age = parseInt(age[0]);
    }

    if (msg.includes('income') || msg.includes('earn')) {
        const income = msg.match(/\d+/);
        if (income) extractedInfo.income = parseInt(income[0]);
    }

    if (msg.includes('farmer') || msg.includes('student') || msg.includes('business')) {
        if (msg.includes('farmer')) extractedInfo.occupation = 'Farmer';
        if (msg.includes('student')) extractedInfo.occupation = 'Student';
        if (msg.includes('business')) extractedInfo.occupation = 'Business';
    }

    if (msg.includes('delhi') || msg.includes('mumbai') || msg.includes('tamil nadu') || msg.includes('karnataka')) {
        if (msg.includes('delhi')) extractedInfo.state = 'Delhi';
        if (msg.includes('mumbai')) extractedInfo.state = 'Maharashtra';
        if (msg.includes('tamil nadu')) extractedInfo.state = 'Tamil Nadu';
        if (msg.includes('karnataka')) extractedInfo.state = 'Karnataka';
    }

    let botResponse = "";

    try {
        if (SARVAM_API_KEY && SARVAM_API_KEY !== 'your_key_here') {
            // Using Sarvam API 
            const formattedHistory = [];
            if (history && Array.isArray(history)) {
                history.forEach(item => {
                    let lastRole = formattedHistory.length > 0 ? formattedHistory[formattedHistory.length - 1].role : 'system';
                    const role = item.role === 'bot' || item.role === 'assistant' ? 'assistant' : 'user';
                    const content = item.content || item.text;
                    // Skip system messages or invalid formatting
                    if (content) {
                        // Sarvam API requires the first message after 'system' to be from 'user'
                        if (formattedHistory.length === 0 && role === 'assistant') {
                            return; // Skip leading assistant messages (like the greeting)
                        }

                        if (role !== lastRole) {
                            formattedHistory.push({ role: role, content: content });
                        } else {
                            // Merge content if roles are identical to keep alternating pattern
                            formattedHistory[formattedHistory.length - 1].content += "\n" + content;
                        }
                    }
                });
            }

            // Look up the schemes database from llm_training_data.jsonl
            const searchContext = `${message} ${extractedInfo.occupation || ''} ${extractedInfo.state || ''} ${extractedInfo.age ? extractedInfo.age + ' years' : ''} ${extractedInfo.income ? 'income ' + extractedInfo.income : ''}`.trim();
            const matchedSchemes = searchSchemes(searchContext, 3, extractedInfo);
            const relevantSchemesData = matchedSchemes.map(s => s.content).join("\n\n");

            let systemPrompt = `You are Mitra, an AI assistant helping Indians find government schemes.\n`;
            systemPrompt += `You are having a conversation with the user to understand their profile (age, income, occupation, location) and suggest relevant schemes.\n`;
            if (relevantSchemesData) {
                systemPrompt += `\nHere is some information about schemes that might be relevant to the user query:\n${relevantSchemesData}\n\n`;
                systemPrompt += `Use the information provided above to answer the user's questions about schemes.\n`;
            }
            const langNames = {
                'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil',
                'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam',
                'bn': 'Bengali', 'mr': 'Marathi', 'gu': 'Gujarati',
                'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese', 'ur': 'Urdu', 'bho': 'Bhojpuri', 'sa': 'Sanskrit',
                'mai': 'Maithili', 'kok': 'Konkani', 'doi': 'Dogri', 'sd': 'Sindhi', 'ks': 'Kashmiri', 'ne': 'Nepali',
                'mai': 'Maithili', 'kok': 'Konkani', 'doi': 'Dogri', 'sd': 'Sindhi', 'ks': 'Kashmiri', 'ne': 'Nepali'
            };
            const langName = langNames[language] || 'English';
            systemPrompt += `The user is speaking in ${langName}. Please reply in that language.\n`;
            systemPrompt += `Be polite, concise, and helpful. If you don't know something, ask for more details.\n`;
            systemPrompt += `Currently extracted info: ${JSON.stringify(extractedInfo)}`;

            let messagesPayload = [
                { role: "system", content: systemPrompt },
                ...formattedHistory
            ];

            const lastHistoryRole = messagesPayload.length > 0 ? messagesPayload[messagesPayload.length - 1].role : 'system';

            if (lastHistoryRole === 'user') {
                messagesPayload[messagesPayload.length - 1].content += "\n" + message;
            } else {
                messagesPayload.push({ role: "user", content: message });
            }

            const payload = {
                model: "sarvam-m",
                messages: messagesPayload,
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 1024
            };

            const headers = {
                "Content-Type": "application/json",
                "api-subscription-key": SARVAM_API_KEY
            };

            const response = await axios.post("https://api.sarvam.ai/v1/chat/completions", payload, { headers });

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                botResponse = response.data.choices[0].message.content;
            } else {
                throw new Error("Invalid response format from Sarvam API");
            }
        } else {
            // Fallback logic if API key is not configured
            if (language === 'hi') {
                botResponse = "मैंने आपका संदेश प्राप्त किया है: '" + message + "'। (कृपा करके ध्यान दें: Sarvam API की कुंजी कॉन्फ़िगर नहीं की गई है, इसलिए यह एक स्वचालित उत्तर है।)";
            } else if (language === 'ta') {
                botResponse = "உங்கள் செய்தியை நான் பெற்றுள்ளேன்: '" + message + "'. (கவனியுங்கள்: Sarvam API சாவி அமைக்கப்பட்டிருக்கவில்லை, எனவே இது தானியங்கி பதில்.)";
            } else {
                botResponse = "I have received your message: '" + message + "'. (Please note: The Sarvam API key is not yet configured, so this is an automated fallback response.)";
            }
        }
    } catch (error) {
        console.error("Sarvam API Error:", error?.response?.data || error.message);
        if (language === 'hi') {
            botResponse = "क्षमा करें, आपके संदेश को संसाधित करते समय एक समस्या आई।";
        } else if (language === 'ta') {
            botResponse = "மன்னிக்கவும், உங்கள் செய்தியைச் செயலாக்குவதில் பிழை ஏற்பட்டது.";
        } else {
            botResponse = "I'm sorry, there was a problem processing your request using the AI. Please try again later.";
        }
    }

    const finalSearchContext = `${message} ${extractedInfo.occupation || ''} ${extractedInfo.state || ''} ${extractedInfo.age ? extractedInfo.age + ' years' : ''} ${extractedInfo.income ? 'income ' + extractedInfo.income : ''}`.trim();

    const suggestedList = (botResponse && typeof searchSchemes === 'function') ? searchSchemes(finalSearchContext, 3, extractedInfo) : [];

    // Add basic eligibility status to each scheme
    const schemesWithEligibility = suggestedList.map(scheme => {
        let status = 'Check Eligibility';
        let matchScore = scheme.matchScore || 0;
        let reasons = scheme.reasons || [];

        // Additional implicit scoring based on generic stats if they exist
        if (extractedInfo.age) matchScore++;
        if (extractedInfo.income) matchScore++;

        const isProfileComplete = Object.keys(extractedInfo).length >= 4;

        if (reasons.length > 0) {
            status = isProfileComplete ? `Highly Eligible (${reasons.join(', ')})` : `Eligible (${reasons.join(', ')})`;
        } else if (matchScore > 0) {
            status = 'Potentially Eligible';
        }

        return { ...scheme, eligibilityStatus: status, matchScore };
    });

    // Optionally filter out schemes that have 0 matchScore when user provided info
    const filteredSchemes = Object.keys(extractedInfo).length > 0
        ? schemesWithEligibility.filter(s => s.matchScore > 0)
        : schemesWithEligibility;

    return {
        reply: botResponse,
        extractedInfo,
        profileComplete: Object.keys(extractedInfo).length >= 4,
        suggestedSchemes: filteredSchemes,
        isAppointmentIntent
    };
};

module.exports = { processMessage };
