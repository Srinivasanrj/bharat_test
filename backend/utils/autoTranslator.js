const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/translations_cache.json');
let cache = {};

try {
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
} catch (e) {
    console.warn("Cache load skipped (serverless environment):", e.message);
}

const saveCache = () => {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        // In Lambda, filesystem is read-only; cache stays in-memory only
        console.warn("Cache save skipped (read-only filesystem)");
    }
};

const translateText = async (textArray, targetLang) => {
    if (!targetLang || targetLang === 'en') return textArray;
    if (!cache[targetLang]) cache[targetLang] = {};

    const results = new Array(textArray.length);
    const missingIndices = [];
    const missingTexts = [];

    textArray.forEach((text, i) => {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            results[i] = text;
            return;
        }

        const original = text.trim();
        if (cache[targetLang][original]) {
            results[i] = cache[targetLang][original];
        } else {
            missingIndices.push(i);
            missingTexts.push(original);
            results[i] = original;
        }
    });

    if (missingTexts.length === 0) return results;

    try {
        const separator = ' \n ||| \n ';
        let currentBatch = [];
        let currentLen = 0;
        let batchIndices = [];

        const flushBatch = async (batch, bIndices) => {
            const joined = batch.join(separator);
            const params = new URLSearchParams();
            params.append('q', joined);

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t`;
            const response = await axios.post(url, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            let fullTranslated = "";
            if (response.data && response.data[0]) {
                response.data[0].forEach(chunk => {
                    if (chunk[0]) fullTranslated += chunk[0];
                });
            }

            const translatedItems = fullTranslated.split(/\|\|\|/g).map(s => s.trim());

            for (let i = 0; i < batch.length; i++) {
                if (bIndices[i] !== undefined) {
                    const originalText = batch[i];
                    const translatedText = translatedItems[i] || originalText;
                    cache[targetLang][originalText] = translatedText;
                    results[bIndices[i]] = translatedText;
                }
            }
        };

        for (let i = 0; i < missingTexts.length; i++) {
            const t = missingTexts[i];
            // Ensure no inner ||| conflict, just simple replace
            const cleanT = t.replace(/\|\|\|/g, '');
            if (currentLen + cleanT.length > 2000 && currentBatch.length > 0) {
                await flushBatch(currentBatch, batchIndices);
                currentBatch = [];
                batchIndices = [];
                currentLen = 0;
            }
            currentBatch.push(cleanT);
            batchIndices.push(missingIndices[i]);
            currentLen += cleanT.length;
        }

        if (currentBatch.length > 0) {
            await flushBatch(currentBatch, batchIndices);
        }

        saveCache();
    } catch (error) {
        console.error("Translation API error:", error.message);
    }

    return results;
};

const translateSchemes = async (schemes, targetLang) => {
    if (!targetLang || targetLang === 'en') return schemes;

    const textsToTranslate = [];
    const mapping = [];

    // Use a cloned array so we don't pollute the cached global array in memory
    const resultSchemes = JSON.parse(JSON.stringify(schemes));

    resultSchemes.forEach((scheme, i) => {
        const fields = ['name', 'description', 'benefit', 'eligibility_text', 'application', 'documents', 'level', 'category', 'tags'];
        fields.forEach(field => {
            if (scheme[field]) {
                textsToTranslate.push(scheme[field]);
                mapping.push({ objIndex: i, field });
            }
        });
    });

    const translatedTexts = await translateText(textsToTranslate, targetLang);

    mapping.forEach((map, j) => {
        const trt = translatedTexts[j];
        if (trt) {
            resultSchemes[map.objIndex][map.field] = trt;
        }
    });

    return resultSchemes;
};

module.exports = { translateSchemes };
