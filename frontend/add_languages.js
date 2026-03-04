import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsFilePath = path.join(__dirname, 'src', 'utils', 'translations.js');
let fileContent = fs.readFileSync(translationsFilePath, 'utf8');

// The new languages to add
const newLanguages = [
    { code: 'pa', name: 'Punjabi', bcp47: 'pa-IN' },
    { code: 'or', name: 'Odia', bcp47: 'or-IN' },
    { code: 'as', name: 'Assamese', bcp47: 'as-IN' },
    { code: 'ur', name: 'Urdu', bcp47: 'ur-IN' }
];

async function run() {
    console.log("Adding new languages natively...");

    // Instead of importing, just parse the JS text simply since it's just two exported objects
    // Extract languageMap and translations strings via regex
    const lmRegex = /export const languageMap = (\{[\s\S]*?\});/;
    const trRegex = /export const translations = (\{[\s\S]*?\});/;

    let languageMapStr = lmRegex.exec(fileContent)[1];
    let translationsStr = trRegex.exec(fileContent)[1];

    // Convert to JSON-like objects safely 
    // We can evaluate it since it's trusted code
    let languageMap = eval('(' + languageMapStr + ')');
    let translations = eval('(' + translationsStr + ')');

    const enDict = translations['en'];
    const keys = Object.keys(enDict);

    for (let lang of newLanguages) {
        if (translations[lang.code]) {
            console.log(`${lang.name} already exists.`);
            continue;
        }

        console.log(`Translating to ${lang.name}...`);
        translations[lang.code] = {};
        languageMap[lang.code] = lang.bcp47;

        const chunks = [];
        let currentChunk = [];
        let currentLen = 0;
        for (let key of keys) {
            const val = enDict[key];
            if (currentLen + val.length > 1500) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentLen = 0;
            }
            currentChunk.push({ key, text: val });
            currentLen += val.length;
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        for (let chunk of chunks) {
            const joined = chunk.map(c => c.text.replace(/\|\|\|/g, '')).join(' ||| ');
            const params = new URLSearchParams();
            params.append('q', joined);

            try {
                const res = await axios.post(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang.code}&dt=t`, params.toString());
                let fullTranslated = "";
                if (res.data && res.data[0]) {
                    res.data[0].forEach(p => { if (p[0]) fullTranslated += p[0]; });
                }
                const translatedItems = fullTranslated.split(/\|\|\|/g).map(s => s.trim());
                chunk.forEach((c, idx) => {
                    translations[lang.code][c.key] = translatedItems[idx] || c.text;
                });
            } catch (e) {
                console.error(`Translation failed for chunk in ${lang.name}:`, e.message);
                chunk.forEach(c => { translations[lang.code][c.key] = c.text; });
            }
        }
    }

    // Now write back
    let generatedCode = `export const languageMap = {\n`;
    const lmKeys = Object.keys(languageMap);
    lmKeys.forEach((k, idx) => {
        generatedCode += `    '${k}': '${languageMap[k]}'${idx < lmKeys.length - 1 ? ',' : ''}\n`;
    });
    generatedCode += `};\n\nexport const translations = {\n`;

    const tKeys = Object.keys(translations);
    tKeys.forEach((langCode, idx1) => {
        generatedCode += `    ${langCode}: {\n`;
        const dict = translations[langCode];
        const dictKeys = Object.keys(dict);
        dictKeys.forEach((k, idx2) => {
            let escapedVal = String(dict[k]).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            generatedCode += `        ${k}: "${escapedVal}"${idx2 < dictKeys.length - 1 ? ',' : ''}\n`;
        });
        generatedCode += `    }${idx1 < tKeys.length - 1 ? ',' : ''}\n`;
    });
    generatedCode += `};\n`;

    fs.writeFileSync(translationsFilePath, generatedCode);
    console.log("translations.js updated successfully.");
}

run();
