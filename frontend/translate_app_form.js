import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFormPath = path.join(__dirname, 'src', 'pages', 'ApplicationForm.jsx');
let fileContent = fs.readFileSync(appFormPath, 'utf8');

const newLanguages = [
    { code: 'pa', name: 'Punjabi' },
    { code: 'or', name: 'Odia' },
    { code: 'as', name: 'Assamese' },
    { code: 'ur', name: 'Urdu' }
];

const enPrompts = {
    fullName: 'Please tell me your full name.',
    aadharNumber: 'Please tell me your 12 digit Aadhar number.',
    phone: 'Please tell me your mobile number.',
    email: 'Please tell me your email address.',
    stateLoc: 'Which state are you from?',
    age: 'What is your age?',
    occupation: 'What is your occupation?',
    income: 'What is your annual income?',
    allFilled: 'All details are already filled. Please review the form, upload your documents, and submit.',
    finished: 'Thank you. I have collected all the details. Please upload your required documents and submit the application.',
    error: "I didn't hear anything. Let's try filling the form manually.",
    confirm: "You said {value}. Is this correct? Say yes or no."
};

async function translatePrompts() {
    let injections = '';
    const keys = Object.keys(enPrompts);

    for (let lang of newLanguages) {
        if (fileContent.includes(`'${lang.code}': {`)) {
            console.log(`Language ${lang.code} already exists in ApplicationForm.`);
            continue;
        }

        console.log(`Translating prompts to ${lang.name}...`);
        const translatedDict = {};

        const joined = keys.map(k => enPrompts[k]).join(' ||| ');
        const params = new URLSearchParams();
        params.append('q', joined);

        try {
            const res = await axios.post(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang.code}&dt=t`, params.toString());
            let fullTranslated = "";
            if (res.data && res.data[0]) {
                res.data[0].forEach(p => { if (p[0]) fullTranslated += p[0]; });
            }
            const translatedItems = fullTranslated.split(/\|\|\|/g).map(s => s.trim());
            keys.forEach((k, idx) => {
                let text = translatedItems[idx] || enPrompts[k];
                translatedDict[k] = text.replace(/'/g, "\\'");
            });

        } catch (e) {
            console.error(`Translation failed for ${lang.name}:`, e.message);
            keys.forEach(k => { translatedDict[k] = enPrompts[k]; });
        }

        injections += `        '${lang.code}': {\n`;
        keys.forEach(k => {
            injections += `            ${k}: '${translatedDict[k]}',\n`;
        });
        injections += `            yes_variants: ['yes', 'ok'],\n`;
        injections += `            no_variants: ['no']\n`;
        injections += `        },\n`;
    }

    if (injections) {
        const targetString = `    };\n    const t_prompt = prompts[lang] || prompts['en'];`;
        if (fileContent.includes(targetString)) {
            fileContent = fileContent.replace(targetString, injections + targetString);
            fs.writeFileSync(appFormPath, fileContent);
            console.log("Successfully injected translated prompts into ApplicationForm.jsx");
        } else {
            const match = fileContent.match(/}\s*;\s*const t_prompt/);
            if (match) {
                fileContent = fileContent.replace(match[0], '},\n' + injections + match[0]);
                fs.writeFileSync(appFormPath, fileContent);
                console.log("Successfully injected via regex match");
            } else {
                console.log("Could not find the target injection point in ApplicationForm.jsx");
            }
        }
    }
}

translatePrompts();
