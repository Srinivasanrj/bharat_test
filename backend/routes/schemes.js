const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { checkEligibility } = require('../utils/eligibilityChecker');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "SchemesTable";

// Helper function to get all items from DynamoDB (handles pagination)
async function getAllSchemes() {
    let items = [];
    let lastEvaluatedKey = undefined;

    do {
        const params = {
            TableName: TABLE_NAME,
        };
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const result = await docClient.send(new ScanCommand(params));
        items = items.concat(result.Items || []);
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
}

// Also keep the local JSON as a fallback for local development
let localSchemesData = null;
try {
    localSchemesData = require('../data/schemes_database.json');
} catch (e) {
    // Not available (e.g., in Lambda), that's fine
}

// GET all schemes (from schemes_database.json equivalent)
router.get('/', async (req, res) => {
    try {
        if (localSchemesData) {
            return res.json(localSchemesData);
        }
        const schemes = await getAllSchemes();
        res.json(schemes);
    } catch (error) {
        console.error("Error fetching schemes:", error);
        res.status(500).json({ error: "Failed to fetch schemes" });
    }
});

// POST check eligibility
router.post('/check-eligibility', async (req, res) => {
    try {
        const { userProfile } = req.body;
        let schemes;
        if (localSchemesData) {
            schemes = localSchemesData;
        } else {
            schemes = await getAllSchemes();
        }
        const results = schemes.map(scheme => {
            const eligibilityStatus = checkEligibility(scheme, userProfile);
            return {
                ...scheme,
                eligibilityStatus
            };
        });
        res.json(results);
    } catch (error) {
        console.error("Error checking eligibility:", error);
        res.status(500).json({ error: "Failed to check eligibility" });
    }
});

// GET all CSV schemes (paginated, with search and translation)
router.get('/all-csv', async (req, res) => {
    try {
        // Get all schemes from DynamoDB
        let results = await getAllSchemes();

        const { search, location } = req.query;

        if (search && search.trim() !== '') {
            const s = search.toLowerCase();
            results = results.filter(item =>
                (item.name && item.name.toLowerCase().includes(s)) ||
                (item.description && item.description.toLowerCase().includes(s)) ||
                (item.category && item.category.toLowerCase().includes(s))
            );
        }

        if (location && location.trim() !== '') {
            const l = location.toLowerCase();
            results = results.filter(item =>
                (item.level && item.level.toLowerCase().includes(l)) ||
                (item.eligibility_text && item.eligibility_text.toLowerCase().includes(l)) ||
                (item.tags && item.tags.toLowerCase().includes(l)) ||
                (item.name && item.name.toLowerCase().includes(l)) ||
                (item.description && item.description.toLowerCase().includes(l))
            );
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        let paginatedSchemes = results.slice(startIndex, endIndex);

        const lang = req.query.lang;
        if (lang && lang !== 'en') {
            const { translateSchemes } = require('../utils/autoTranslator');
            paginatedSchemes = await translateSchemes(paginatedSchemes, lang);
        }

        res.json({
            total: results.length,
            page: page,
            pages: Math.ceil(results.length / limit),
            schemes: paginatedSchemes
        });
    } catch (error) {
        console.error("Error reading schemes:", error);
        res.status(500).json({ error: "Failed to fetch schemes data" });
    }
});

module.exports = router;
