const express = require('express');
const router = express.Router();
const schemesData = require('../data/schemes_database.json');
const { checkEligibility } = require('../utils/eligibilityChecker');

// GET all schemes
router.get('/', (req, res) => {
    res.json(schemesData);
});

// POST check eligibility
router.post('/check-eligibility', (req, res) => {
    const { userProfile } = req.body;
    const results = schemesData.map(scheme => {
        const eligibilityStatus = checkEligibility(scheme, userProfile);
        return {
            ...scheme,
            eligibilityStatus // 'eligible', 'docs_needed', 'not_eligible'
        };
    });
    res.json(results);
});

router.get('/all-csv', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(__dirname, '../data/csv_schemes.json');

        let results = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

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
        console.error("Error reading CSV schemes:", error);
        res.status(500).json({ error: "Failed to fetch schemes data" });
    }
});

module.exports = router;
