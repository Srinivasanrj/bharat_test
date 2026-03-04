const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

let schemesDatabase = [];

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function loadSchemesCache() {
    if (schemesDatabase.length > 0) return; // already loaded

    // First, try loading from local JSONL file (for local development)
    const localPath = path.join(__dirname, '..', '..', '..', 'llm_training_data.jsonl');
    const altPath = 'C:\\Users\\Srinivasan\\OneDrive\\Documents\\Desktop\\ai for barath\\llm_training_data.jsonl';

    let filePath = null;
    if (fs.existsSync(localPath)) {
        filePath = localPath;
    } else if (fs.existsSync(altPath)) {
        filePath = altPath;
    }

    if (filePath) {
        // Local mode: read from JSONL file
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        console.log("Loading schemes database from local JSONL...");

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                const assistantMessage = parsed.messages.find(m => m.role === 'assistant');
                if (assistantMessage && assistantMessage.content) {
                    const content = assistantMessage.content;
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
        console.log(`Loaded ${schemesDatabase.length} schemes from JSONL.`);
    } else {
        // Cloud mode: load from DynamoDB
        console.log("Loading schemes database from DynamoDB...");
        try {
            let items = [];
            let lastEvaluatedKey = undefined;

            do {
                const params = { TableName: "SchemesTable" };
                if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;

                const result = await docClient.send(new ScanCommand(params));
                items = items.concat(result.Items || []);
                lastEvaluatedKey = result.LastEvaluatedKey;
            } while (lastEvaluatedKey);

            for (const item of items) {
                const content = `**${item.name || 'Unknown Scheme'}**\n${item.description || ''}\n${item.benefit || ''}\n${item.eligibility_text || ''}`;
                schemesDatabase.push({
                    name: item.name || "Unknown Scheme",
                    content: content,
                    words: new Set(content.toLowerCase().split(/\W+/).filter(w => w.length > 2))
                });
            }
            console.log(`Loaded ${schemesDatabase.length} schemes from DynamoDB.`);
        } catch (err) {
            console.error("Error loading from DynamoDB:", err.message);
        }
    }
}

function searchSchemes(query, topK = 3, userProfile = null) {
    if (schemesDatabase.length === 0) return [];

    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return [];

    const scoredSchemes = schemesDatabase.map(scheme => {
        let score = 0;
        for (const qw of queryWords) {
            if (scheme.words.has(qw)) {
                score += 1;
            }
        }

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
        }

        return { scheme, score, matchScore, reasons };
    });

    scoredSchemes.sort((a, b) => b.score - a.score);

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
