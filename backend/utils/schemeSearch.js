const fs = require('fs');
const readline = require('readline');
const path = require('path');

let schemesDatabase = [];

async function loadSchemesCache() {
    if (schemesDatabase.length > 0) return; // already loaded

    const filePath = 'C:\\Users\\Srinivasan\\OneDrive\\Documents\\Desktop\\ai for barath\\llm_training_data.jsonl';

    if (!fs.existsSync(filePath)) {
        console.error("JSONL file not found at:", filePath);
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log("Loading schemes database...");

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const parsed = JSON.parse(line);
            // Assuming the assistant's message has the scheme details
            const assistantMessage = parsed.messages.find(m => m.role === 'assistant');
            if (assistantMessage && assistantMessage.content) {
                const content = assistantMessage.content;
                // Basic extraction of the scheme name (first line wrapped in **)
                let nameMatch = content.match(/\*\*([^*]+)\*\*/);
                let name = nameMatch ? nameMatch[1] : "Unknown Scheme";

                schemesDatabase.push({
                    name: name,
                    content: content,
                    words: new Set(content.toLowerCase().split(/\W+/).filter(w => w.length > 2))
                });
            }
        } catch (err) {
            console.error("Error parsing a line in JSONL:", err);
        }
    }
    console.log(`Loaded ${schemesDatabase.length} schemes into cache.`);
}

function searchSchemes(query, topK = 3, userProfile = null) {
    if (schemesDatabase.length === 0) return [];

    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    // Score based on how many query words appear in the scheme content
    const scoredSchemes = schemesDatabase.map(scheme => {
        let score = 0;
        for (const qw of queryWords) {
            if (scheme.words.has(qw)) {
                score += 1;
            }
        }

        // Add eligibility bonus
        let matchScore = 0;
        let reasons = [];
        if (userProfile) {
            const contentLC = scheme.content.toLowerCase();
            if (userProfile.state && contentLC.includes(userProfile.state.toLowerCase())) {
                matchScore += 1;
                score += 10;
                reasons.push(userProfile.state);
            }
            if (userProfile.occupation && contentLC.includes(userProfile.occupation.toLowerCase())) {
                matchScore += 1;
                score += 10;
                reasons.push(userProfile.occupation);
            }
            // Cannot reliably regex match age/income against unstructured text, so we assume partial check if text has digits
        }

        return { scheme, score, matchScore, reasons };
    });

    // Sort by score descending
    scoredSchemes.sort((a, b) => b.score - a.score);

    // Filter out zero scores and take topK
    const bestMatches = scoredSchemes.filter(s => s.score > 0).slice(0, topK);
    return bestMatches.map(m => ({
        name: m.scheme.name,
        content: m.scheme.content,
        matchScore: m.matchScore,
        reasons: m.reasons
    }));
}

module.exports = {
    loadSchemesCache,
    searchSchemes
};
