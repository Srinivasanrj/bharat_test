import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, CheckCircle, FileText, User, Mail, Phone, MapPin, Mic, MicOff, Bot, Shield, RefreshCw, Camera, Loader2 } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import { motion } from 'framer-motion';
import { languageMap } from '../utils/translations';
import Tesseract from 'tesseract.js';

const ApplicationForm = ({ globalLanguage }) => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '',
        aadharNumber: '',
        phone: '',
        captchaInput: '',
        email: '',
        age: state?.userProfile?.age || '',
        occupation: state?.userProfile?.occupation || '',
        stateLoc: state?.userProfile?.state || '',
        income: state?.userProfile?.income || '',
    });

    const [captcha, setCaptcha] = useState('');
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);

    const [cameraOpen, setCameraOpen] = useState(false);
    const [currentDocType, setCurrentDocType] = useState(null);
    const [capturedDocs, setCapturedDocs] = useState({ aadhaar: null, income: null, birth: null });
    const [isVerifyingDocs, setIsVerifyingDocs] = useState(false);
    const [isScanningDoc, setIsScanningDoc] = useState(false);

    const preprocessImageForOCR = (imageSrc) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Upscale image if it's too small, this helps Tesseract significantly
                const scale = Math.max(1, 1500 / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                // Improve crispness when scaling
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Get image data to apply filters
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Grayscale and increase contrast
                const contrast = 1.5; // increase contrast by 50%
                const intercept = 128 * (1 - contrast);

                for (let i = 0; i < data.length; i += 4) {
                    // Convert to grayscale
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Apply contrast
                    let newColor = gray * contrast + intercept;

                    // Threshold to pure black/white can sometimes hurt but high contrast helps
                    // newColor = newColor > 128 ? 255 : 0; // Uncomment for pure b/w threshold

                    data[i] = data[i + 1] = data[i + 2] = newColor;
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 1.0));
            };
            img.src = imageSrc;
        });
    };

    const extractAadharDetails = async (imageSrc) => {
        setIsScanningDoc(true);
        try {
            const processedImage = await preprocessImageForOCR(imageSrc);
            const result = await Tesseract.recognize(processedImage, 'eng');
            const text = result.data.text;

            console.log("OCR Extracted Text:", text); // Helpful for debugging

            let extractedData = {};

            // 1. Extract Aadhaar Number
            // Pattern 1: XXXX XXXX XXXX (allow diverse spaces/hyphens)
            const aadharPattern1 = text.match(/\b\d{4}[\s-]+\d{4}[\s-]+\d{4}\b/);
            // Pattern 2: XXXXXXXXXXXX (12 consecutive digits)
            const aadharPattern2 = text.match(/\b\d{12}\b/);

            if (aadharPattern1) {
                extractedData.aadharNumber = aadharPattern1[0].replace(/\D/g, '');
            } else if (aadharPattern2) {
                extractedData.aadharNumber = aadharPattern2[0];
            } else {
                // Heuristic: check if 3 consecutive 4-digit blocks exist in tokens
                const tokens = text.split(/[\s\n]+/).map(t => t.replace(/\D/g, ''));
                for (let i = 0; i <= tokens.length - 3; i++) {
                    if (tokens[i].length === 4 && tokens[i + 1].length === 4 && tokens[i + 2].length === 4) {
                        extractedData.aadharNumber = tokens[i] + tokens[i + 1] + tokens[i + 2];
                        break;
                    }
                }
            }

            // 2. Extract DOB / Age
            // Look for DD/MM/YYYY or YYYY anywhere
            const dobMatch = text.match(/\b\d{2}[/.-]\d{2}[/.-]\d{4}\b/);
            const yearMatchArray = text.match(/\b(?:19|20)\d{2}\b/g);
            let year = null;

            if (dobMatch) {
                const parts = dobMatch[0].split(/[/.-]/);
                year = parseInt(parts[2]);
            } else if (yearMatchArray && yearMatchArray.length > 0) {
                const currentYear = new Date().getFullYear();
                const validYears = yearMatchArray.map(Number).filter(y => y > 1900 && y <= currentYear);
                if (validYears.length > 0) {
                    year = validYears[0];
                }
            }

            if (year) {
                const currentYear = new Date().getFullYear();
                if (year > 1900 && year <= currentYear) {
                    extractedData.age = (currentYear - year).toString();
                }
            }

            // 3. Extract Name
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            // Try to find DOB line or Gender line to serve as anchor
            const dobLineIndex = lines.findIndex(l => /(?:DOB|Year of Birth|YOB|DO8|D0B|Male|Female|MALE|FEMALE)/i.test(l) || /\b\d{2}[/.-]\d{2}[/.-]\d{4}\b/.test(l) || /\b(?:19|20)\d{2}\b/.test(l));

            if (dobLineIndex > 0) {
                // Name is usually 1 or 2 lines above DOB/Gender in Aadhaar
                for (let i = Math.max(0, dobLineIndex - 2); i < dobLineIndex; i++) {
                    const line = lines[i].replace(/[^a-zA-Z\s.]/g, '').trim();
                    if (line.length > 3 && !/government|india|father|mother|wife|s\/o|w\/o|d\/o/i.test(line)) {
                        extractedData.fullName = line;
                    }
                }
            }

            if (Object.keys(extractedData).length > 0) {
                setFormData(prev => ({ ...prev, ...extractedData }));
                if (extractedData.fullName) {
                    verifyExtractedName(extractedData.fullName);
                }
            } else {
                alert("Could not automatically extract details from this format. Please enter text manually, or try a clearer image.");
            }
        } catch (err) {
            console.error("OCR Error:", err);
        } finally {
            setIsScanningDoc(false);
        }
    };

    const handleCapture = (file, dataUrl) => {
        // We preserve the reference to currentDocType inside the handler execution by grabbing it from state
        const currentType = currentDocType;
        setCapturedDocs(prev => ({ ...prev, [currentType]: dataUrl }));
        setCameraOpen(false);
        setCurrentDocType(null);
    };

    const handleFileUpload = (e, docType) => {
        const file = e.target.files[0];
        setCurrentDocType(docType);
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                setCapturedDocs(prev => ({ ...prev, [docType]: dataUrl }));
            };
            reader.readAsDataURL(file);
        }
    };

    const generateCaptcha = () => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let newCaptcha = '';
        for (let i = 0; i < 6; i++) {
            newCaptcha += chars[Math.floor(Math.random() * chars.length)];
        }
        setCaptcha(newCaptcha);
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    const lang = globalLanguage || state?.language || 'en';
    const langCode = languageMap[lang] || 'en-IN';

    const [isAssisting, setIsAssisting] = useState(false);
    const [listeningToField, setListeningToField] = useState(null);
    const [confirmingField, setConfirmingField] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const schemeName = state?.scheme?.name || 'Selected Government Scheme';
    const reqDocs = state?.scheme?.requiredDocuments || ['aadhaar', 'income'];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleVerifyPhone = () => {
        if (!formData.phone || formData.phone.length < 10) {
            alert('Please enter a valid phone number.');
            return;
        }
        if (formData.captchaInput !== captcha) {
            alert('Invalid Captcha. Please try again.');
            generateCaptcha();
            return;
        }
        setIsPhoneVerified(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isPhoneVerified) {
            alert('Please verify your phone number using the captcha before submitting.');
            return;
        }
        window.speechSynthesis.cancel();
        // Here you would normally send the data to a backend
        setIsSubmitted(true);
    };

    const speakText = (text, onEnd) => {
        if (!window.speechSynthesis) {
            if (onEnd) onEnd();
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;

        // Try to find native voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(langCode.substring(0, 2)));
        if (voice) utterance.voice = voice;

        if (onEnd) utterance.onend = onEnd;
        window.speechSynthesis.speak(utterance);
    };

    const prompts = {
        'en': {
            verifyUpload: 'I found the name {value} from your document. Is this correct? Say yes or no.',
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
            confirm: "You said {value}. Is this correct? Say yes or no.",
            yes_variants: ['yes', 'yeah', 'yep', 'correct', 'right', 'ok'],
            no_variants: ['no', 'nope', 'incorrect', 'wrong', 'change']
        },
        'hi': {
            verifyUpload: 'मुझे आपके दस्तावेज़ से {value} नाम मिला है। क्या यह सही है? हाँ या ना कहें।',
            fullName: 'कृपया अपना पूरा नाम बताएं।',
            aadharNumber: 'कृपया अपना 12 अंकों का आधार नंबर बताएं।',
            phone: 'कृपया अपना मोबाइल नंबर बताएं।',
            email: 'कृपया अपना ईमेल पता बताएं।',
            stateLoc: 'आप किस राज्य से हैं?',
            age: 'आपकी उम्र क्या है?',
            occupation: 'आपका व्यवसाय क्या है?',
            income: 'आपकी वार्षिक आय क्या है?',
            allFilled: 'सभी विवरण पहले से ही भरे हुए हैं। कृपया फॉर्म की समीक्षा करें, अपने दस्तावेज अपलोड करें, और जमा करें।',
            finished: 'धन्यवाद। मैंने सभी विवरण एकत्र कर लिए हैं। कृपया अपने आवश्यक दस्तावेज अपलोड करें और आवेदन जमा करें।',
            error: "मुझे कुछ सुनाई नहीं दिया। आइए मैन्युअल रूप से फॉर्म भरने का प्रयास करें।",
            confirm: "आपने कहा {value}. क्या यह सही है? हाँ या ना कहें।",
            yes_variants: ['हाँ', 'हां', 'जी हाँ', 'सही', 'yes', 'जी', 'ओके'],
            no_variants: ['ना', 'नहीं', 'गलत', 'no', 'बदलें']
        },
        'ta': {
            verifyUpload: 'உங்கள் ஆவணத்திலிருந்து {value} என்ற பெயரைக் கண்டுபிடித்தேன். இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
            fullName: 'உங்கள் முழுப் பெயரைக் கூறவும்.',
            aadharNumber: 'உங்கள் 12 இலக்க ஆதார் எண்ணைக் கூறவும்.',
            phone: 'உங்கள் மொபைல் எண்ணைக் கூறவும்.',
            email: 'உங்கள் மின்னஞ்சல் முகவரியைக் கூறவும்.',
            stateLoc: 'நீங்கள் எந்த மாநிலத்தை சேர்ந்தவர்?',
            age: 'உங்கள் வயது என்ன?',
            occupation: 'உங்கள் தொழில் என்ன?',
            income: 'உங்கள் ஆண்டு வருமானம் என்ன?',
            allFilled: 'எல்லா விவரங்களும் ஏற்கனவே நிரப்பப்பட்டுள்ளன. படிவத்தை சரிபார்த்து ஆவணங்களை பதிவேற்றி சமர்ப்பிக்கவும்.',
            finished: 'நன்றி. நான் எல்லா விவரங்களையும் சேகரித்துவிட்டேன். தேவையான ஆவணங்களை பதிவேற்றி விண்ணப்பத்தை சமர்ப்பிக்கவும்.',
            error: "எனக்கு எதுவும் கேட்கவில்லை. படிவத்தை நாமே நிரப்ப முயற்சிப்போம்.",
            confirm: "நீங்கள் சொன்னது {value}. இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.",
            yes_variants: ['ஆம்', 'ஆமாம்', 'சரி', 'yes', 'ஓகே'],
            no_variants: ['இல்லை', 'தவறு', 'no', 'மாற்று']
        },
        'te': {
            verifyUpload: 'మీ పత్రం నుండి నేను {value} అనే పేరును కనుగొన్నాను. ఇది సరైనదేనా? అవును లేదా కాదు అని చెప్పండి.',
            fullName: 'దయచేసి మీ పూర్తి పేరును చెప్పండి.',
            aadharNumber: 'దయచేసి మీ 12 అంకెల ఆధార్ నంబర్‌ను చెప్పండి.',
            phone: 'దయచేసి మీ మొబైల్ నంబర్‌ను చెప్పండి.',
            email: 'దయచేసి మీ ఇమెయిల్ చిరునామాను చెప్పండి.',
            stateLoc: 'మీరు ఏ రాష్ట్రం నుండి వచ్చారు?',
            age: 'మీ వయస్సు ఎంత?',
            occupation: 'మీ వృత్తి ఏమిటి?',
            income: 'మీ వార్షిక ఆదాయం ఎంత?',
            allFilled: 'అన్ని వివరాలు ఇప్పటికే నింపబడ్డాయి. దయచేసి ఫారమ్‌ను సమీక్షించి, పత్రాలను అప్‌లోడ్ చేసి సమర్పించండి.',
            finished: 'ధన్యవాదాలు. దయచేసి పత్రాలను అప్‌లోడ్ చేసి దరఖాస్తును సమర్పించండి.',
            error: "నాకు ఏమీ వినపడలేదు. మాన్యువల్‌గా ప్రయత్నిద్దాం.",
            confirm: "మీరు చెప్పారు {value}. ఇది సరైనదేనా? అవును లేదా కాదు అని చెప్పండి.",
            yes_variants: ['అవును', 'సరియే', 'yes', 'ok'],
            no_variants: ['కాదు', 'లేదు', 'no']
        },
        'kn': {
            verifyUpload: 'ನಿಮ್ಮ ಡಾಕ್ಯುಮೆಂಟ್‌ನಿಂದ ನಾನು {value} ಹೆಸರನ್ನು ಕಂಡುಕೊಂಡಿದ್ದೇನೆ. ಇದು ಸರಿಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
            fullName: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ಹೇಳಿ.',
            aadharNumber: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ 12 ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
            phone: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
            email: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ಹೇಳಿ.',
            stateLoc: 'ನೀವು ಯಾವ ರಾಜ್ಯದವರಾಗಿದ್ದೀರಿ?',
            age: 'ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?',
            occupation: 'ನಿಮ್ಮ ಉದ್ಯೋಗವೇನು?',
            income: 'ನಿಮ್ಮ ವಾರ್ಷಿಕ ಆದಾಯ ಎಷ್ಟು?',
            allFilled: 'ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಈಗಾಗಲೇ ಭರ್ತಿ ಮಾಡಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ.',
            finished: 'ಧನ್ಯವಾದಗಳು. ದಯವಿಟ್ಟು ಸಲ್ಲಿಸಿ.',
            error: "ನನಗೆ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ನಾವೇ ಭರ್ತಿ ಮಾಡೋಣ.",
            confirm: "ನೀವು ಹೇಳಿದ್ದು {value}. ಇದು ಸರಿಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.",
            yes_variants: ['ಹೌದು', 'ಸರಿ', 'yes', 'ok'],
            no_variants: ['ಇಲ್ಲ', 'ತಪ್ಪು', 'no']
        },
        'ml': {
            verifyUpload: 'നിങ്ങളുടെ രേഖയിൽ നിന്ന് ഞാൻ {value} എന്ന പേര് കണ്ടെത്തി. ഇത് ശരിയാണോ? അതെ അല്ലെങ്കിൽ അല്ല എന്ന് പറയുക.',
            fullName: 'നിങ്ങളുടെ മുഴുവൻ പേരും പറയുക.',
            aadharNumber: 'നിങ്ങളുടെ 12 അക്ക ആധാർ നമ്പർ പറയുക.',
            phone: 'നിങ്ങളുടെ മൊബൈൽ നമ്പർ പറയുക.',
            email: 'നിങ്ങളുടെ ഇമെയിൽ വിലാസം പറയുക.',
            stateLoc: 'നിങ്ങൾ ഏത് സംസ്ഥാനത്താണ് താമസം?',
            age: 'നിങ്ങളുടെ പ്രായം എത്രയാണ്?',
            occupation: 'നിങ്ങളുടെ തൊഴിൽ എന്താണ്?',
            income: 'നിങ്ങളുടെ വാർഷിക വരുമാനം എത്രയാണ്?',
            allFilled: 'എല്ലാ വിവരങ്ങളും നൽകിയിട്ടുണ്ട്. ഫോം പരിശോധിച്ചു സമർപ്പിക്കുക.',
            finished: 'നന്ദി. രേഖകൾ അപ്ലോഡ് ചെയ്തു അപേക്ഷ സമർപ്പിക്കുക.',
            error: "എനിക്കൊന്നും കേൾക്കാൻ കഴിഞ്ഞില്ല.",
            confirm: "നിങ്ങൾ പറഞ്ഞത് {value}. ഇത് ശരിയാണോ? അതെ അല്ലെങ്കിൽ അല്ല എന്ന് പറയുക.",
            yes_variants: ['അതെ', 'ശരി', 'yes', 'ok'],
            no_variants: ['അല്ല', 'തെറ്റ്', 'no']
        },
        'bn': {
            verifyUpload: 'আমি আপনার নথি থেকে {value} নামটি পেয়েছি। এটা কি ঠিক? হ্যাঁ বা না বলুন।',
            fullName: 'অনুগ্রহ করে আপনার পুরো নাম বলুন।',
            aadharNumber: 'অনুগ্রহ করে আপনার ১২ অঙ্কের আধার নম্বর বলুন।',
            phone: 'অনুগ্রহ করে আপনার মোবাইল নম্বর বলুন।',
            email: 'অনুগ্রহ করে আপনার ইমেইল ঠিকানা বলুন।',
            stateLoc: 'আপনি কোন রাজ্য থেকে এসেছেন?',
            age: 'আপনার বয়স কত?',
            occupation: 'আপনার পেশা কী?',
            income: 'আপনার বার্ষিক আয় কত?',
            allFilled: 'সব বিবরণ ইতিমধ্যে পূরণ করা হয়েছে। ফর্মটি পর্যালোচনা করুন।',
            finished: 'ধন্যবাদ। আমি সব বিবরণ সংগ্রহ করেছি।',
            error: "আমি কিছু শুনতে পাইনি।",
            confirm: "আপনি বলেছেন {value}. এটা কি ঠিক? হ্যাঁ বা না বলুন।",
            yes_variants: ['হ্যাঁ', 'ঠিক', 'yes', 'ok'],
            no_variants: ['না', 'ভুল', 'no']
        },
        'mr': {
            verifyUpload: 'मला तुमच्या दस्तऐवजातून {value} हे नाव सापडले. हे बरोबर आहे का? हो किंवा नाही सांगा.',
            fullName: 'कृपया आपले पूर्ण नाव सांगा.',
            aadharNumber: 'कृपया आपला १२ अंकी आधार क्रमांक सांगा.',
            phone: 'कृपया आपला मोबाईल क्रमांक सांगा.',
            email: 'कृपया आपला ईमेल पत्ता सांगा.',
            stateLoc: 'आपण कोणत्या राज्य मधून आहात?',
            age: 'आपले वय काय आहे?',
            occupation: 'आपला व्यवसाय काय आहे?',
            income: 'आपले वार्षिक उत्पन्न काय आहे?',
            allFilled: 'सर्व तपशील आधीच भरलेले आहेत. कृपया फॉर्म तपासा.',
            finished: 'धन्यवाद. मी सर्व माहिती जमा केली आहे.',
            error: "मला काही ऐकू आले नाही.",
            confirm: "तुम्ही म्हणालात {value}. हे बरोबर आहे का? हो किंवा नाही सांगा.",
            yes_variants: ['हो', 'बरोबर', 'yes', 'ok'],
            no_variants: ['नाही', 'चूक', 'no']
        },
        'gu': {
            verifyUpload: 'મને તમારા દસ્તાવેજમાંથી {value} નામ મળ્યું. શું આ સાચું છે? હા કે ના કહો.',
            fullName: 'કૃપા કરીને તમારું પૂરું નામ કહો.',
            aadharNumber: 'કૃપા કરીને તમારો 12 અંકનો આધાર નંબર કહો.',
            phone: 'કૃપા કરીને તમારો મોબાઇલ નંબર કહો.',
            email: 'કૃપા કરીને તમારું ઇમેઇલ સરનામું કહો.',
            stateLoc: 'તમે કયા રાજ્યમાંથી છો?',
            age: 'તમારી ઉંમર કેટલી છે?',
            occupation: 'તમારો વ્યવસાય શું છે?',
            income: 'તમારી વાર્ષિક આવક કેટલી છે?',
            allFilled: 'બધી વિગતો પહેલેથી જ ભરેલી છે. કૃપા કરીને ફોર્મ તપાસો.',
            finished: 'આભાર. મેં બધી વિગતો એકત્રિત કરી છે.',
            error: "મને કશું સંભળાયું નહીં.",
            confirm: "તમે કહ્યું {value}. શું આ સાચું છે? હા કે ના કહો.",
            yes_variants: ['હા', 'સાચું', 'yes', 'ok'],
            no_variants: ['ના', 'ખોટું', 'no']
        },

        'pa': {
            verifyUpload: 'ਮੈਨੂੰ ਤੁਹਾਡੇ ਦਸਤਾਵੇਜ਼ ਤੋਂ {value} ਨਾਮ ਮਿਲਿਆ ਹੈ। ਕੀ ਇਹ ਸਹੀ ہے? ਹਾਂ ਜਾਂ ਨਾਂਹ ਕਹੋ।',
            fullName: 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦੱਸੋ।',
            aadharNumber: 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਆਪਣਾ 12 ਅੰਕਾਂ ਦਾ ਆਧਾਰ ਨੰਬਰ ਦੱਸੋ।',
            phone: 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦੱਸੋ।',
            email: 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਆਪਣਾ ਈਮੇਲ ਪਤਾ ਦੱਸੋ।',
            stateLoc: 'ਤੁਸੀਂ ਕਿਸ ਰਾਜ ਤੋਂ ਹੋ?',
            age: 'ਤੁਹਾਡੀ ਉਮਰ ਕਿੰਨੀ ਹੈ?',
            occupation: 'ਤੁਹਾਡਾ ਕਿੱਤਾ ਕੀ ਹੈ?',
            income: 'ਤੁਹਾਡੀ ਸਾਲਾਨਾ ਆਮਦਨ ਕੀ ਹੈ?',
            allFilled: 'ਸਾਰੇ ਵੇਰਵੇ ਪਹਿਲਾਂ ਹੀ ਭਰੇ ਹੋਏ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਫਾਰਮ ਦੀ ਸਮੀਖਿਆ ਕਰੋ, ਆਪਣੇ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ, ਅਤੇ ਜਮ੍ਹਾਂ ਕਰੋ।',
            finished: 'ਤੁਹਾਡਾ ਧੰਨਵਾਦ. ਮੈਂ ਸਾਰੇ ਵੇਰਵੇ ਇਕੱਠੇ ਕਰ ਲਏ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ ਅਤੇ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ।',
            error: 'ਮੈਂ ਕੁਝ ਨਹੀਂ ਸੁਣਿਆ। ਆਉ ਫਾਰਮ ਨੂੰ ਹੱਥੀਂ ਭਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੀਏ।',
            confirm: 'ਤੁਸੀਂ ਕਿਹਾ {value}। ਕੀ ਇਹ ਸਹੀ ਹੈ? ਹਾਂ ਜਾਂ ਨਾਂਹ ਕਹੋ।',
            yes_variants: ['yes', 'ok'],
            no_variants: ['no']
        },
        'or': {
            verifyUpload: 'ମୁଁ ଆପଣଙ୍କ ଡକ୍ୟୁମେଣ୍ଟରୁ {value} ନାମ ପାଇଲି | ଏହା ଠିକ୍ କି? ହଁ କିମ୍ବା ନା କୁହ |',
            fullName: 'ଦୟାକରି ମୋତେ ତୁମର ସମ୍ପୂର୍ଣ୍ଣ ନାମ କୁହ |',
            aadharNumber: 'ଦୟାକରି ମୋତେ ଆପଣଙ୍କର 12 ଅଙ୍କ ବିଶିଷ୍ଟ ଆଧାର ନମ୍ବର କୁହନ୍ତୁ |',
            phone: 'ଦୟାକରି ମୋତେ ଆପଣଙ୍କର ମୋବାଇଲ୍ ନମ୍ବର କୁହନ୍ତୁ |',
            email: 'ଦୟାକରି ମୋତେ ଆପଣଙ୍କର ଇମେଲ୍ ଠିକଣା କୁହନ୍ତୁ |',
            stateLoc: 'ଆପଣ କେଉଁ ରାଜ୍ୟରୁ ଆସିଛନ୍ତି?',
            age: 'ତୁମର ବୟସ କେତେ?',
            occupation: 'ତୁମର ବୃତ୍ତି କ’ଣ?',
            income: 'ତୁମର ବାର୍ଷିକ ଆୟ କ’ଣ?',
            allFilled: 'ସମସ୍ତ ବିବରଣୀ ପୁରଣ ହୋଇସାରିଛି | ଦୟାକରି ଫର୍ମ ସମୀକ୍ଷା କରନ୍ତୁ, ଆପଣଙ୍କର ଡକ୍ୟୁମେଣ୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ ଏବଂ ଦାଖଲ କରନ୍ତୁ |',
            finished: 'ଧନ୍ୟବାଦ ମୁଁ ସମସ୍ତ ବିବରଣୀ ସଂଗ୍ରହ କରିଛି | ଦୟାକରି ଆପଣଙ୍କର ଆବଶ୍ୟକୀୟ ଡକ୍ୟୁମେଣ୍ଟ୍ ଅପଲୋଡ୍ କରନ୍ତୁ ଏବଂ ଆବେଦନ ଦାଖଲ କରନ୍ତୁ |',
            error: 'ମୁଁ କିଛି ଶୁଣି ନାହିଁ ଚାଲନ୍ତୁ ଫର୍ମକୁ ମାନୁଆଲ ପୂରଣ କରିବାକୁ ଚେଷ୍ଟା କରିବା |',
            confirm: 'ତୁମେ {ମୂଲ୍ୟ} କହିଛ | ଏହା ଠିକ୍ କି? ହଁ କିମ୍ବା ନା କୁହ |',
            yes_variants: ['yes', 'ok'],
            no_variants: ['no']
        },
        'as': {
            verifyUpload: 'মই আপোনাৰ নথিখনৰ পৰা {value} নামটো পালোঁ। এইটো শুদ্ধ নেকি? হয় বা নহয় বুলি কওক।',
            fullName: 'আপোনাৰ সম্পূৰ্ণ নামটো কওকচোন।',
            aadharNumber: 'আপোনাৰ ১২ অংকৰ আধাৰ নম্বৰটো জনাব।',
            phone: 'আপোনাৰ মোবাইল নম্বৰটো জনাব।',
            email: 'অনুগ্ৰহ কৰি আপোনাৰ ইমেইল ঠিকনা মোক জনাওক।',
            stateLoc: 'আপুনি কোনখন ৰাজ্যৰ?',
            age: 'আপোনাৰ বয়স কিমান?',
            occupation: 'আপোনাৰ বৃত্তি কি?',
            income: 'আপোনাৰ বাৰ্ষিক আয় কিমান?',
            allFilled: 'ইতিমধ্যে সকলো সবিশেষ পূৰণ কৰা হৈছে। অনুগ্ৰহ কৰি প্ৰপত্ৰখন পৰ্যালোচনা কৰক, আপোনাৰ নথিপত্ৰসমূহ আপলোড কৰক, আৰু জমা দিয়ক।',
            finished: 'ধন্যবাদ। সকলো সবিশেষ সংগ্ৰহ কৰিছো। আপোনাৰ প্ৰয়োজনীয় নথি-পত্ৰ আপলোড কৰি আবেদন জমা দিব।',
            error: 'একো শুনা নাছিলোঁ। ফৰ্মখন হাতেৰে পূৰণ কৰি চাওঁ আহক।',
            confirm: 'আপুনি কৈছিল {মূল্য}। এইটো শুদ্ধ নেকি? হয় বা নহয় বুলি কওক।',
            yes_variants: ['yes', 'ok'],
            no_variants: ['no']
        },
        'bho': {
            verifyUpload: 'हमरा रउआ दस्तावेज़ से {value} नाम मिलल बा। का ई सही बा? हाँ या ना कहीं।',
            back: 'पीछे',
            stop_assistant: 'सहायक रोकीं',
            auto_fill: 'आवाज से भरल',
            official_form: 'आधिकारिक सत्यापन और आवेदन फॉर्म',
            full_name: 'पूरा नाम',
            aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर',
            email: 'ईमेल पता',
            state: 'राज्य',
            age: 'उमर',
            occupation: 'पेशा',
            annual_income: 'सालाना आमदनी (₹)',
            required_docs: 'जरूरी दस्तावेज',
            upload_docs_text: 'कृपया जरूरी दस्तावेज के स्कैन कॉपी अपलोड करीं।',
            aadhaar_card: 'आधार कार्ड',
            id_proof: 'पहचान और पता के प्रमाण',
            income_proof: 'आय/रोजगार के प्रमाण',
            valid_cert: 'वैध प्रमाण पत्र',
            submit_app: 'आवेदन जमा करीं',
            verify_phone: 'फोन नंबर सत्यापित करीं',
            verify: 'सत्यापित करीं',
            listening: 'सुनल जा रहल बा...',
            confirming: 'पुष्टि कइल जा रहल बा...',
            enter_name: 'आपन पूरा नाम दर्ज करीं',
            enter_aadhar: '12 अंक के आधार नंबर',
            enter_email: 'your@email.com',
            enter_state: 'जइसे, बिहार',
            enter_age: 'उमर',
            enter_occ: 'जइसे, किसान, छात्र',
            enter_income: 'आमदनी दर्ज करीं',
            enter_captcha: 'कैप्चा दर्ज करीं',
            app_submitted: 'आवेदन जमा हो गइल!',
            app_forwarded: 'रउआ आवेदन सफलता से भेजल गइल बा।',
            return_home: 'होम पर वापस जाईं',
            enter_phone: '+91'
        },
        'sa': {
            verifyUpload: 'मया भवतः पत्रात् {value} नाम लब्धम्। किं एतत् सम्यक् अस्ति? आम् वा न वदतु।',
            back: 'पृष्ठे',
            stop_assistant: 'सहायकं स्थगयतु',
            auto_fill: 'ध्वनिना पूरयतु',
            official_form: 'आधिकारिक-प्रमाणनम् आवेदनपत्रं च',
            full_name: 'पूर्णनाम',
            aadhar_num: 'आधार-सङ्ख्या',
            mobile_num: 'चलदूरभाष-सङ्ख्या',
            email: 'ईमेल-सङ्केतः',
            state: 'राज्यम्',
            age: 'वयः',
            occupation: 'वृत्तिः',
            annual_income: 'वार्षिक-आयः (₹)',
            required_docs: 'आवश्यक-पत्राणि',
            upload_docs_text: 'कृपया पत्राणि आरोपयतु।',
            aadhaar_card: 'आधार-पत्रम्',
            id_proof: 'परिचयपत्रम्',
            income_proof: 'आय-प्रमाणपत्रम्',
            valid_cert: 'प्रमाणपत्रम्',
            submit_app: 'आवेदनं ददातु',
            verify_phone: 'दूरभाष-प्रमाणनम्',
            verify: 'प्रमाणयतु',
            listening: 'शृणोति...',
            confirming: 'पुष्टीकरोति...',
            enter_name: 'पूर्णनाम लिखतु',
            enter_aadhar: '12-अङ्कीय-आधारम्',
            enter_email: 'your@email.com',
            enter_state: 'यथा, कर्नाटकम्',
            enter_age: 'वयः',
            enter_occ: 'यथा, कृषकः',
            enter_income: 'आयम् लिखतु',
            enter_captcha: 'कैप्चा लिखतु',
            app_submitted: 'आवेदनं पूर्णम्!',
            app_forwarded: 'भवतः आवेदनं प्रेषितम् अस्ति।',
            return_home: 'मुख्यपृष्ठं गच्छतु',
            enter_phone: '+91'
        },
        'bho': {
            welcome: "आवेदन फॉर्म में रउआ स्वागत बा। हमरा नाम, आधार नंबर अउर मोबाइल नंबर जइसन छोट जानकारी चाहीं। का हम शुरू करीं? हाँ या ना कहीं।",
            error: "माफ करीं, हम सुन ना पावलीं। कृपया फेर से कहीं।",
            verifyUpload: 'हमरा रउआ दस्तावेज़ से {value} नाम मिलल बा। का ई सही बा? हाँ या ना कहीं।',
            fullName: "रउआ पूरा नाम का ह?",
            aadharNumber: "रउआ 12 अंक के आधार नंबर का ह?",
            phone: "रउआ मोबाइल नंबर का ह?",
            email: "रउआ ईमेल पता का ह?",
            stateLoc: "रउआ राज्य के नाम का ह?",
            age: "रउआ उमर का ह?",
            occupation: "रउआ का काम करीले?",
            income: "रउआ सालाना आमदनी केतना बा?",
            confirm: "रउआ कहनी {value}। का ई सही बा? हाँ या ना कहीं।",
            finished: "धन्यवाद। सब जानकारी भर दिहल गइल बा। रउआ अब फॉर्म जमा कर सकेनी।",
            allFilled: "रउआ फॉर्म पहिले से भरल बा। रउआ एकरा के जमा कर सकेनी।",
            yes_variants: ["हाँ", "हां", "सही", "ठीक"],
            no_variants: ["ना", "नहीं", "गलत", "न"]
        },
        'sa': {
            welcome: "आवेदनपत्रे स्वागतम्। नाम, आधारसङ्ख्या, दूरभाषः इत्यादीनि कानिचन विवरणानि आवश्यकानि सन्ति। किं वयम् आरभामहे? आम् वा न वदतु।",
            error: "क्षम्यताम्, अहं न श्रुतवान्। कृपया पुनः वदतु।",
            verifyUpload: 'मया भवतः पत्रात् {value} नाम लब्धम्। किं एतत् सम्यक् अस्ति? आम् वा न वदतु।',
            fullName: "भवतः पूर्णनाम किम्?",
            aadharNumber: "भवतः आधारसङ्ख्या का?",
            phone: "भवतः चलदूरभाषसङ्ख्या का?",
            email: "भवतः ईमेलसङ्केतः कः?",
            stateLoc: "भवतः राज्यं किम्?",
            age: "भवतः वयः किम्?",
            occupation: "भवतः वृत्तिः का?",
            income: "भवतः वार्षिक-आयः कियत् अस्ति?",
            confirm: "भवता उक्तम् {value} अस्ति। किं एतत् सम्यक् अस्ति? आम् वा न वदतु।",
            finished: "धन्यवादः। सर्वाणि विवरणानि पूरितानि सन्ति। भवान् अधुना आवेदनं दातुं शक्नोति।",
            allFilled: "भवतः आवेदनपत्रं पूर्वमेव पूरितम् अस्ति। भवान् तत् दातुं शक्नोति।",
            yes_variants: ["आम्", "सत्यम्", "सम्यक्", "हा"],
            no_variants: ["न", "नास्ति", "असत्यम्", "नही"]
        },
        'mai': {
            verifyUpload: 'हमरा अहाँक दस्तावेज़ स {value} नाम भेटल अछि। की ई सही अछि? हाँ या ना कहू।',
            back: 'पाछाँ', stop_assistant: 'सहायक रोकू', auto_fill: 'आवाज स भरू',
            official_form: 'आधिकारिक फॉर्म', full_name: 'पूरा नाम', aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर', email: 'ईमेल', state: 'राज्य', age: 'उमर',
            occupation: 'पेशा', annual_income: 'सालाना आमदनी', required_docs: 'जरूरी दस्तावेज',
            upload_docs_text: 'दस्तावेज अपलोड करू।', aadhaar_card: 'आधार कार्ड', id_proof: 'पहचान प्रमाण',
            income_proof: 'आय प्रमाण', valid_cert: 'वैध प्रमाण पत्र', submit_app: 'आवेदन जमा करू',
            verify_phone: 'फोन सत्यापित करू', verify: 'सत्यापित करू', listening: 'सुनि रहल अछि...',
            confirming: 'पुष्टि भ रहल अछि...', enter_name: 'नाम दर्ज करू', enter_aadhar: '12 अंकक आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'उमर', enter_occ: 'पेशा',
            enter_income: 'आमदनी', enter_captcha: 'कैप्चा', app_submitted: 'आवेदन जमा भेल!',
            app_forwarded: 'आवेदन भेजल गेल अछि।', return_home: 'होम पर जाउ', enter_phone: '+91'
        },
        'kok': {
            verifyUpload: 'म्हाका तुमच्या कागदपत्रांतल्यान {value} हें नांव मेळ्ळां. हें बरोबर आसा काय? हय वा ना सांगात.',
            back: 'फाटीं', stop_assistant: 'सहाय्यक बंद करात', auto_fill: 'आवाजान भरा',
            official_form: 'अधिकृत फॉर्म', full_name: 'पूर्ण नांव', aadhar_num: 'आधार क्रमांक',
            mobile_num: 'मोबाईल क्रमांक', email: 'ईमेल', state: 'राज्य', age: 'पिराय',
            occupation: 'वेवसाय', annual_income: 'वार्षिक उत्पन्न', required_docs: 'गरजेचीं कागदपत्रां',
            upload_docs_text: 'कागदपत्रां अपलोड करात.', aadhaar_card: 'आधार कार्ड', id_proof: 'ओळखपत्र',
            income_proof: 'उत्पन्नाचो दाखलो', valid_cert: 'प्रमाणपत्र', submit_app: 'अर्ज जमा करात',
            verify_phone: 'फोन पडताळून पळयात', verify: 'पडताळात', listening: 'आयकता...',
            confirming: 'निश्चित करता...', enter_name: 'नांव बरयात', enter_aadhar: '12 अंकी आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'पिराय', enter_occ: 'वेवसाय',
            enter_income: 'उत्पन्न', enter_captcha: 'कॅप्चा', app_submitted: 'अर्ज जमा केलो!',
            app_forwarded: 'अर्ज धाडला.', return_home: 'मुखेल पानाचेर वचात', enter_phone: '+91'
        },
        'doi': {
            verifyUpload: 'मिगी तुंदे दस्तावेज़ थमां {value} नां लब्भा ऐ. केह् एह् सही ऐ? हां या ना आखो.',
            back: 'पिच्छै', stop_assistant: 'सहायक रोको', auto_fill: 'आवाज कनै भरो',
            official_form: 'आधिकारिक फॉर्म', full_name: 'पूरा नां', aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर', email: 'ईमेल', state: 'राज्य', age: 'उमर',
            occupation: 'पेशा', annual_income: 'सालाना आमदनी', required_docs: 'जरूरी दस्तावेज',
            upload_docs_text: 'दस्तावेज अपलोड करो.', aadhaar_card: 'आधार कार्ड', id_proof: 'पहचान प्रमाण',
            income_proof: 'आय प्रमाण', valid_cert: 'प्रमाण पत्र', submit_app: 'आवेदन जमा करो',
            verify_phone: 'फोन सत्यापित करो', verify: 'सत्यापित करो', listening: 'सुना करदा ऐ...',
            confirming: 'पुष्टि करा करदा ऐ...', enter_name: 'नां दर्ज करो', enter_aadhar: '12 अंकें दा आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'उमर', enter_occ: 'पेशा',
            enter_income: 'आमदनी', enter_captcha: 'कैप्चा', app_submitted: 'आवेदन जमा होआ!',
            app_forwarded: 'आवेदन भेजिया गेआ ऐ.', return_home: 'होम पर वापस जाओ', enter_phone: '+91'
        },
        'sd': {
            verifyUpload: 'مون کي توهان جي دستاويز مان {value} نالو مليو. ڇا هي صحيح آهي؟ ها يا نه چئو.',
            back: 'واپس', stop_assistant: 'اسسٽنٽ روڪيو', auto_fill: 'آواز ذريعي ڀريو',
            official_form: 'سرڪاري فارم', full_name: 'پورو نالو', aadhar_num: 'آڌار نمبر',
            mobile_num: 'موبائيل نمبر', email: 'اي ميل', state: 'رياست', age: 'عمر',
            occupation: 'پيشو', annual_income: 'سالياني آمدني', required_docs: 'ضروري دستاويز',
            upload_docs_text: 'دستاويز اپلوڊ ڪريو.', aadhaar_card: 'آڌار ڪارڊ', id_proof: 'سڃاڻپ جو ثبوت',
            income_proof: 'آمدني جو ثبوت', valid_cert: 'سرٽيفڪيٽ', submit_app: 'درخواست جمع ڪريو',
            verify_phone: 'فون جي تصديق ڪريو', verify: 'تصديق ڪريو', listening: 'ٻڌي رهيو آهي...',
            confirming: 'تصديق ڪري رهيو آهي...', enter_name: 'نالو داخل ڪريو', enter_aadhar: '12 انگن جو آڌار',
            enter_email: 'اي ميل', enter_state: 'رياست', enter_age: 'عمر', enter_occ: 'پيشو',
            enter_income: 'آمدني', enter_captcha: 'ڪيپچا', app_submitted: 'درخواست جمع ٿي وئي!',
            app_forwarded: 'توهان جي درخواست موڪلي وئي آهي.', return_home: 'هوم تي واپس وڃو', enter_phone: '+91'
        },
        'ks': {
            verifyUpload: 'مےٚ میول تُہنٛدِ دستاویزس منزٕ {value} ناو. کیا یہِ چھا صٔحیح؟ آ یا نہ ونِیو.',
            back: 'واپس', stop_assistant: 'اسسٹنٹ رُکٲویو', auto_fill: 'آواز سۭتھ بٔریو',
            official_form: 'سرکٲری فارم', full_name: 'پوٗرٕ ناو', aadhar_num: 'آدھار نمبر',
            mobile_num: 'موبٲیِل نمبر', email: 'ای میل', state: 'ریاست', age: 'وٲنٛس',
            occupation: 'کام', annual_income: 'سالانہٕ آمدنی', required_docs: 'ضروٗری دستاویز',
            upload_docs_text: 'دستاویز اپلوڈ کٔریو.', aadhaar_card: 'آدھار کارڈ', id_proof: 'پہچانٕچ ثبوت',
            income_proof: 'آمدنی ہُنٛد ثبوت', valid_cert: 'سرٹیفکیٹ', submit_app: 'اَپلائی کٔریو',
            verify_phone: 'فونٕچ تَصدیٖق کٔریو', verify: 'تَصدیٖق کٔریو', listening: 'بوزان...',
            confirming: 'تَصدیٖق کران...', enter_name: 'ناو دٔرج کٔریو', enter_aadhar: '12 ہندسہٕ آدھار',
            enter_email: 'ای میل', enter_state: 'ریاست', enter_age: 'وٲنٛس', enter_occ: 'کام',
            enter_income: 'آمدنی', enter_captcha: 'کیپچا', app_submitted: 'فارم جَمع گومُت!',
            app_forwarded: 'تُہُنٛد فارم چھُ سُوزنہٕ آمُت.', return_home: 'ہومس پؠٹھ گٔژھیو', enter_phone: '+91'
        },
        'ne': {
            verifyUpload: 'मैले तपाईंको कागजातबाट {value} नाम फेला पारेँ। के यो सही छ? हो वा होइन भन्नुहोस्।',
            back: 'पछाडि', stop_assistant: 'सहायक रोक्नुहोस्', auto_fill: 'आवाजबाट भर्नुहोस्',
            official_form: 'आधिकारिक फारम', full_name: 'पूरा नाम', aadhar_num: 'आधार नम्बर',
            mobile_num: 'मोबाइल नम्बर', email: 'इमेल', state: 'राज्य', age: 'उमेर',
            occupation: 'पेशा', annual_income: 'वार्षिक आम्दानी', required_docs: 'आवश्यक कागजात',
            upload_docs_text: 'कागजातहरू अपलोड गर्नुहोस्।', aadhaar_card: 'आधार कार्ड', id_proof: 'पहिचान प्रमाण',
            income_proof: 'आम्दानी प्रमाण', valid_cert: 'प्रमाणपत्र', submit_app: 'आवेदन बुझाउनुहोस्',
            verify_phone: 'फोन प्रमाणित गर्नुहोस्', verify: 'प्रमाणित गर्नुहोस्', listening: 'सुन्दै छ...',
            confirming: 'प्रमाणीकरण गर्दैछ...', enter_name: 'नाम प्रविष्ट गर्नुहोस्', enter_aadhar: '१२ अंकको आधार',
            enter_email: 'इमेल', enter_state: 'राज्य', enter_age: 'उमेर', enter_occ: 'पेशा',
            enter_income: 'आम्दानी', enter_captcha: 'क्याप्चा', app_submitted: 'आवेदन बुझाइयो!',
            app_forwarded: 'तपाईंको आवेदन पठाइएको छ।', return_home: 'होममा फर्कनुहोस्', enter_phone: '+91'
        },
        'mai': {
            verifyUpload: 'हमरा अहाँक दस्तावेज़ स {value} नाम भेटल अछि। की ई सही अछि? हाँ या ना कहू।',
            back: 'पाछाँ', stop_assistant: 'सहायक रोकू', auto_fill: 'आवाज स भरू',
            official_form: 'आधिकारिक फॉर्म', full_name: 'पूरा नाम', aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर', email: 'ईमेल', state: 'राज्य', age: 'उमर',
            occupation: 'पेशा', annual_income: 'सालाना आमदनी', required_docs: 'जरूरी दस्तावेज',
            upload_docs_text: 'दस्तावेज अपलोड करू।', aadhaar_card: 'आधार कार्ड', id_proof: 'पहचान प्रमाण',
            income_proof: 'आय प्रमाण', valid_cert: 'वैध प्रमाण पत्र', submit_app: 'आवेदन जमा करू',
            verify_phone: 'फोन सत्यापित करू', verify: 'सत्यापित करू', listening: 'सुनि रहल अछि...',
            confirming: 'पुष्टि भ रहल अछि...', enter_name: 'नाम दर्ज करू', enter_aadhar: '12 अंकक आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'उमर', enter_occ: 'पेशा',
            enter_income: 'आमदनी', enter_captcha: 'कैप्चा', app_submitted: 'आवेदन जमा भेल!',
            app_forwarded: 'आवेदन भेजल गेल अछि।', return_home: 'होम पर जाउ', enter_phone: '+91'
        },
        'kok': {
            verifyUpload: 'म्हाका तुमच्या कागदपत्रांतल्यान {value} हें नांव मेळ्ळां. हें बरोबर आसा काय? हय वा ना सांगात.',
            back: 'फाटीं', stop_assistant: 'सहाय्यक बंद करात', auto_fill: 'आवाजान भरा',
            official_form: 'अधिकृत फॉर्म', full_name: 'पूर्ण नांव', aadhar_num: 'आधार क्रमांक',
            mobile_num: 'मोबाईल क्रमांक', email: 'ईमेल', state: 'राज्य', age: 'पिराय',
            occupation: 'वेवसाय', annual_income: 'वार्षिक उत्पन्न', required_docs: 'गरजेचीं कागदपत्रां',
            upload_docs_text: 'कागदपत्रां अपलोड करात.', aadhaar_card: 'आधार कार्ड', id_proof: 'ओळखपत्र',
            income_proof: 'उत्पन्नाचो दाखलो', valid_cert: 'प्रमाणपत्र', submit_app: 'अर्ज जमा करात',
            verify_phone: 'फोन पडताळून पळयात', verify: 'पडताळात', listening: 'आयकता...',
            confirming: 'निश्चित करता...', enter_name: 'नांव बरयात', enter_aadhar: '12 अंकी आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'पिराय', enter_occ: 'वेवसाय',
            enter_income: 'उत्पन्न', enter_captcha: 'कॅप्चा', app_submitted: 'अर्ज जमा केलो!',
            app_forwarded: 'अर्ज धाडला.', return_home: 'मुखेल पानाचेर वचात', enter_phone: '+91'
        },
        'doi': {
            verifyUpload: 'मिगी तुंदे दस्तावेज़ थमां {value} नां लब्भा ऐ. केह् एह् सही ऐ? हां या ना आखो.',
            back: 'पिच्छै', stop_assistant: 'सहायक रोको', auto_fill: 'आवाज कनै भरो',
            official_form: 'आधिकारिक फॉर्म', full_name: 'पूरा नां', aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर', email: 'ईमेल', state: 'राज्य', age: 'उमर',
            occupation: 'पेशा', annual_income: 'सालाना आमदनी', required_docs: 'जरूरी दस्तावेज',
            upload_docs_text: 'दस्तावेज अपलोड करो.', aadhaar_card: 'आधार कार्ड', id_proof: 'पहचान प्रमाण',
            income_proof: 'आय प्रमाण', valid_cert: 'प्रमाण पत्र', submit_app: 'आवेदन जमा करो',
            verify_phone: 'फोन सत्यापित करो', verify: 'सत्यापित करो', listening: 'सुना करदा ऐ...',
            confirming: 'पुष्टि करा करदा ऐ...', enter_name: 'नां दर्ज करो', enter_aadhar: '12 अंकें दा आधार',
            enter_email: 'ईमेल', enter_state: 'राज्य', enter_age: 'उमर', enter_occ: 'पेशा',
            enter_income: 'आमदनी', enter_captcha: 'कैप्चा', app_submitted: 'आवेदन जमा होआ!',
            app_forwarded: 'आवेदन भेजिया गेआ ऐ.', return_home: 'होम पर वापस जाओ', enter_phone: '+91'
        },
        'sd': {
            verifyUpload: 'مون کي توهان جي دستاويز مان {value} نالو مليو. ڇا هي صحيح آهي؟ ها يا نه چئو.',
            back: 'واپس', stop_assistant: 'اسسٽنٽ روڪيو', auto_fill: 'آواز ذريعي ڀريو',
            official_form: 'سرڪاري فارم', full_name: 'پورو نالو', aadhar_num: 'آڌار نمبر',
            mobile_num: 'موبائيل نمبر', email: 'اي ميل', state: 'رياست', age: 'عمر',
            occupation: 'پيشو', annual_income: 'سالياني آمدني', required_docs: 'ضروري دستاويز',
            upload_docs_text: 'دستاويز اپلوڊ ڪريو.', aadhaar_card: 'آڌار ڪارڊ', id_proof: 'سڃاڻپ جو ثبوت',
            income_proof: 'آمدني جو ثبوت', valid_cert: 'سرٽيفڪيٽ', submit_app: 'درخواست جمع ڪريو',
            verify_phone: 'فون جي تصديق ڪريو', verify: 'تصديق ڪريو', listening: 'ٻڌي رهيو آهي...',
            confirming: 'تصديق ڪري رهيو آهي...', enter_name: 'نالو داخل ڪريو', enter_aadhar: '12 انگن جو آڌار',
            enter_email: 'اي ميل', enter_state: 'رياست', enter_age: 'عمر', enter_occ: 'پيشو',
            enter_income: 'آمدني', enter_captcha: 'ڪيپچا', app_submitted: 'درخواست جمع ٿي وئي!',
            app_forwarded: 'توهان جي درخواست موڪلي وئي آهي.', return_home: 'هوم تي واپس وڃو', enter_phone: '+91'
        },
        'ks': {
            verifyUpload: 'مےٚ میول تُہنٛدِ دستاویزس منزٕ {value} ناو. کیا یہِ چھا صٔحیح؟ آ یا نہ ونِیو.',
            back: 'واپس', stop_assistant: 'اسسٹنٹ رُکٲویو', auto_fill: 'آواز سۭتھ بٔریو',
            official_form: 'سرکٲری فارم', full_name: 'پوٗرٕ ناو', aadhar_num: 'آدھار نمبر',
            mobile_num: 'موبٲیِل نمبر', email: 'ای میل', state: 'ریاست', age: 'وٲنٛس',
            occupation: 'کام', annual_income: 'سالانہٕ آمدنی', required_docs: 'ضروٗری دستاویز',
            upload_docs_text: 'دستاویز اپلوڈ کٔریو.', aadhaar_card: 'آدھار کارڈ', id_proof: 'پہچانٕچ ثبوت',
            income_proof: 'آمدنی ہُنٛد ثبوت', valid_cert: 'سرٹیفکیٹ', submit_app: 'اَپلائی کٔریو',
            verify_phone: 'فونٕچ تَصدیٖق کٔریو', verify: 'تَصدیٖق کٔریو', listening: 'بوزان...',
            confirming: 'تَصدیٖق کران...', enter_name: 'ناو دٔرج کٔریو', enter_aadhar: '12 ہندسہٕ آدھار',
            enter_email: 'ای میل', enter_state: 'ریاست', enter_age: 'وٲنٛس', enter_occ: 'کام',
            enter_income: 'آمدنی', enter_captcha: 'کیپچا', app_submitted: 'فارم جَمع گومُت!',
            app_forwarded: 'تُہُنٛد فارم چھُ سُوزنہٕ آمُت.', return_home: 'ہومس پؠٹھ گٔژھیو', enter_phone: '+91'
        },
        'ne': {
            verifyUpload: 'मैले तपाईंको कागजातबाट {value} नाम फेला पारेँ। के यो सही छ? हो वा होइन भन्नुहोस्।',
            back: 'पछाडि', stop_assistant: 'सहायक रोक्नुहोस्', auto_fill: 'आवाजबाट भर्नुहोस्',
            official_form: 'आधिकारिक फारम', full_name: 'पूरा नाम', aadhar_num: 'आधार नम्बर',
            mobile_num: 'मोबाइल नम्बर', email: 'इमेल', state: 'राज्य', age: 'उमेर',
            occupation: 'पेशा', annual_income: 'वार्षिक आम्दानी', required_docs: 'आवश्यक कागजात',
            upload_docs_text: 'कागजातहरू अपलोड गर्नुहोस्।', aadhaar_card: 'आधार कार्ड', id_proof: 'पहिचान प्रमाण',
            income_proof: 'आम्दानी प्रमाण', valid_cert: 'प्रमाणपत्र', submit_app: 'आवेदन बुझाउनुहोस्',
            verify_phone: 'फोन प्रमाणित गर्नुहोस्', verify: 'प्रमाणित गर्नुहोस्', listening: 'सुन्दै छ...',
            confirming: 'प्रमाणीकरण गर्दैछ...', enter_name: 'नाम प्रविष्ट गर्नुहोस्', enter_aadhar: '१२ अंकको आधार',
            enter_email: 'इमेल', enter_state: 'राज्य', enter_age: 'उमेर', enter_occ: 'पेशा',
            enter_income: 'आम्दानी', enter_captcha: 'क्याप्चा', app_submitted: 'आवेदन बुझाइयो!',
            app_forwarded: 'तपाईंको आवेदन पठाइएको छ।', return_home: 'होममा फर्कनुहोस्', enter_phone: '+91'
        },
        'ur': {
            verifyUpload: 'مجھے آپ کی دستاویز سے {value} نام ملا ہے۔ کیا یہ صحیح ہے؟ ہاں یا نہیں کہو۔',
            fullName: 'براہ کرم مجھے اپنا پورا نام بتائیں۔',
            aadharNumber: 'براہ کرم مجھے اپنا 12 ہندسوں کا آدھار نمبر بتائیں۔',
            phone: 'براہ کرم مجھے اپنا موبائل نمبر بتائیں۔',
            email: 'براہ کرم مجھے اپنا ای میل ایڈریس بتائیں۔',
            stateLoc: 'آپ کس ریاست سے ہیں؟',
            age: 'آپ کی عمر کیا ہے؟',
            occupation: 'آپ کا پیشہ کیا ہے؟',
            income: 'آپ کی سالانہ آمدنی کیا ہے؟',
            allFilled: 'تمام تفصیلات پہلے ہی بھری ہوئی ہیں۔ براہ کرم فارم کا جائزہ لیں، اپنی دستاویزات اپ لوڈ کریں، اور جمع کرائیں۔',
            finished: 'شکریہ میں نے تمام تفصیلات جمع کر لی ہیں۔ براہ کرم اپنے مطلوبہ دستاویزات اپ لوڈ کریں اور درخواست جمع کروائیں۔',
            error: 'میں نے کچھ نہیں سنا۔ آئیے فارم کو دستی طور پر بھرنے کی کوشش کریں۔',
            confirm: 'آپ نے کہا {value}۔ کیا یہ صحیح ہے؟ ہاں یا نہیں کہو۔',
            yes_variants: ['yes', 'ok'],
            no_variants: ['no']
        },
    };
    const t_prompt = prompts[lang] || prompts['en'];

    const startVoiceAssistant = () => {
        setIsAssisting(true);
        const fieldsToAsk = [
            { key: 'fullName', prompt: t_prompt.fullName },
            { key: 'aadharNumber', prompt: t_prompt.aadharNumber },
            { key: 'phone', prompt: t_prompt.phone },
            { key: 'email', prompt: t_prompt.email },
            { key: 'stateLoc', prompt: t_prompt.stateLoc },
            { key: 'age', prompt: t_prompt.age },
            { key: 'occupation', prompt: t_prompt.occupation },
            { key: 'income', prompt: t_prompt.income }
        ];

        // Filter out fields that are already filled
        const remainingFields = fieldsToAsk.filter(f => !formData[f.key]);

        if (remainingFields.length === 0) {
            speakText(t_prompt.allFilled);
            setIsAssisting(false);
            return;
        }

        askField(remainingFields, 0);
    };

    const askField = (fieldsList, index) => {
        if (index >= fieldsList.length) {
            speakText(t_prompt.finished);
            setIsAssisting(false);
            setListeningToField(null);
            setConfirmingField(null);
            return;
        }

        const currentField = fieldsList[index];
        setListeningToField(currentField.key);

        speakText(currentField.prompt, () => {
            // Start listening after speaking
            startListeningFor(currentField.key, (transcript) => {
                // Update form data state so user sees it
                setFormData(prev => ({ ...prev, [currentField.key]: transcript }));
                setListeningToField(null);
                setConfirmingField(currentField.key);

                // Wait briefly then ask for confirmation
                setTimeout(() => {
                    const confirmText = t_prompt.confirm.replace('{value}', transcript);
                    speakText(confirmText, () => {
                        startListeningFor('confirm', (confirmTranscript) => {
                            setConfirmingField(null);
                            const ans = confirmTranscript.toLowerCase();
                            const isNo = t_prompt.no_variants.some(v => ans.includes(v));
                            const isYes = t_prompt.yes_variants.some(v => ans.includes(v));

                            if (isNo && !isYes) {
                                // User said no, empty the field and ask again
                                setFormData(prev => ({ ...prev, [currentField.key]: '' }));
                                setTimeout(() => askField(fieldsList, index), 500);
                            } else {
                                // Default to yes/proceed
                                setTimeout(() => askField(fieldsList, index + 1), 500);
                            }
                        });
                    });
                }, 800);
            });
        });
    };

    const startListeningFor = (fieldKey, onResultCallback) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition not supported in this browser.");
            setIsAssisting(false);
            setListeningToField(null);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = langCode;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript;

            // Basic cleanup for certain fields unless it's the confirm context
            if (fieldKey !== 'confirm') {
                if (fieldKey === 'phone' || fieldKey === 'aadharNumber' || fieldKey === 'age' || fieldKey === 'income') {
                    transcript = transcript.replace(/\D/g, ''); // keep only digits
                }
                if (fieldKey === 'email') {
                    transcript = transcript.replace(/\s+/g, '').replace(/at/i, '@').toLowerCase();
                }
            }

            onResultCallback(transcript);
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'network') {
                speakText(t_prompt.error);
            }
            setIsAssisting(false);
            setListeningToField(null);
        };

        recognition.start();
    };


    const verifyExtractedName = (extractedName) => {
        const langToUse = globalLanguage || state?.language || 'en';
        const tf = formTranslations[langToUse] || formTranslations['en'];
        const tp = prompts[langToUse] || prompts['en'];

        setIsAssisting(true);
        setConfirmingField('fullName');

        const templateStr = tf.verifyUpload || prompts['en'].confirm;
        const confirmText = templateStr.replace('{value}', extractedName);

        speakText(confirmText, () => {
            startListeningFor('confirm', (confirmTranscript) => {
                setConfirmingField(null);
                const ans = confirmTranscript.toLowerCase();
                const isNo = tp.no_variants.some(v => ans.includes(v));
                const isYes = tp.yes_variants.some(v => ans.includes(v));

                if (isNo && !isYes) {
                    setFormData(prev => ({ ...prev, fullName: '' }));
                    speakText(tp.error);
                } else {
                    speakText(tp.finished);
                }
                setIsAssisting(false);
            });
        });
    };

    const formTranslations = {
        'en': {
            verifyUpload: 'I found the name {value} from your document. Is this correct? Say yes or no.',
            back: 'Back',
            stop_assistant: 'Stop Assistant',
            auto_fill: 'Auto-Fill by Voice',
            official_form: 'Official Verification & Application Form',
            full_name: 'Full Name',
            aadhar_num: 'Aadhar Number',
            mobile_num: 'Mobile Number',
            email: 'Email Address',
            state: 'State',
            age: 'Age',
            occupation: 'Occupation',
            annual_income: 'Annual Income (₹)',
            required_docs: 'Required Documents',
            upload_docs_text: 'Please upload scanned copies of the required documents to support your eligibility.',
            aadhaar_card: 'Aadhaar Card',
            id_proof: 'Identity & Address Proof (Max 2MB)',
            income_proof: 'Income/Occupation Proof',
            valid_cert: 'Recent Valid Certificate (Max 2MB)',
            birth_cert: 'Birth Certificate',
            submit_app: 'Submit Application',
            verify_phone: 'Verify Phone Number',
            verify: 'Verify',
            listening: 'Listening...',
            confirming: 'Confirming...',
            enter_name: 'Enter your full name',
            enter_aadhar: '12 Digit Aadhar',
            enter_email: 'your@email.com',
            enter_state: 'E.g., Tamil Nadu',
            enter_age: 'Age in years',
            enter_occ: 'E.g., Farmer, Student',
            enter_income: 'Enter numerical amount',
            enter_captcha: 'Enter captcha',
            app_submitted: 'Application Submitted!',
            app_forwarded: 'Your application for requested scheme has been successfully forwarded to the respective department.',
            return_home: 'Return Home',
            enter_phone: '+91'
        },
        'hi': {
            verifyUpload: 'मुझे आपके दस्तावेज़ से {value} नाम मिला है। क्या यह सही है? हाँ या ना कहें।',
            back: 'वापस',
            stop_assistant: 'सहायक बंद करें',
            auto_fill: 'आवाज़ से स्वतः भरें',
            official_form: 'आधिकारिक सत्यापन और आवेदन पत्र',
            full_name: 'पूरा नाम',
            aadhar_num: 'आधार नंबर',
            mobile_num: 'मोबाइल नंबर',
            email: 'ईमेल पता',
            state: 'राज्य',
            age: 'आयु',
            occupation: 'व्यवसाय',
            annual_income: 'वार्षिक आय (₹)',
            required_docs: 'आवश्यक दस्तावेज़',
            upload_docs_text: 'कृपया अपनी पात्रता का समर्थन करने के लिए आवश्यक दस्तावेजों की स्कैन की गई प्रतियां अपलोड करें।',
            aadhaar_card: 'आधार कार्ड',
            id_proof: 'पहचान और पता प्रमाण (अधिकतम 2MB)',
            income_proof: 'आय/व्यवसाय प्रमाण',
            valid_cert: 'नवीनतम वैध प्रमाणपत्र (अधिकतम 2MB)',
            birth_cert: 'जन्म प्रमाणपत्र',
            submit_app: 'आवेदन जमा करें',
            verify_phone: 'फ़ोन नंबर सत्यापित करें',
            verify: 'सत्यापित करें',
            listening: 'सुन रहा है...',
            confirming: 'पुष्टि कर रहा है...',
            enter_name: 'अपना पूरा नाम दर्ज करें',
            enter_aadhar: '12 अंकों का आधार',
            enter_email: 'your@email.com',
            enter_state: 'उदा., उत्तर प्रदेश',
            enter_age: 'वर्षों में आयु',
            enter_occ: 'उदा., किसान, छात्र',
            enter_income: 'संख्यात्मक राशि दर्ज करें',
            enter_captcha: 'कैप्चा दर्ज करें',
            app_submitted: 'आवेदन जमा किया गया!',
            app_forwarded: 'अनुरोधित योजना के लिए आपका आवेदन सफलतापूर्वक संबंधित विभाग को भेज दिया गया है।',
            return_home: 'होम पर लौटें',
            enter_phone: '+91'
        },
        'ta': {
            verifyUpload: 'உங்கள் ஆவணத்திலிருந்து {value} என்ற பெயரைக் கண்டுபிடித்தேன். இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
            back: 'பின்செல்',
            stop_assistant: 'உதவியாளரை நிறுத்து',
            auto_fill: 'குரல் மூலம் தானாக நிரப்பு',
            official_form: 'அதிகாரப்பூர்வ சரிபார்ப்பு மற்றும் விண்ணப்பப் படிவம்',
            full_name: 'முழு பெயர்',
            aadhar_num: 'ஆதார் எண்',
            mobile_num: 'மொபைல் எண்',
            email: 'மின்னஞ்சல் முகவரி',
            state: 'மாநிலம்',
            age: 'வயது',
            occupation: 'தொழில்',
            annual_income: 'ஆண்டு வருமானம் (₹)',
            required_docs: 'தேவையான ஆவணங்கள்',
            upload_docs_text: 'உங்கள் தகுதியை ஆதரிக்க தேவையான ஆவணங்களின் ஸ்கேன் செய்யப்பட்ட நகல்களை பதிவேற்றவும்.',
            aadhaar_card: 'ஆதார் அட்டை',
            id_proof: 'அடையாளம் மற்றும் முகவரி சான்று (அதிகபட்சம் 2MB)',
            income_proof: 'வருமானம்/தொழில் சான்று',
            valid_cert: 'சமீபத்திய செல்லுபடியாகும் சான்றிதழ் (அதிகபட்சம் 2MB)',
            birth_cert: 'பிறப்பு சான்றிதழ்',
            submit_app: 'விண்ணப்பத்தை சமர்ப்பிக்கவும்',
            verify_phone: 'தொலைபேசி எண்ணை சரிபார்க்கவும்',
            verify: 'சரிபார்க்கவும்',
            listening: 'கேட்கிறது...',
            confirming: 'உறுதிப்படுத்துகிறது...',
            enter_name: 'உங்கள் முழு பெயரை உள்ளிடவும்',
            enter_aadhar: '12 இலக்க ஆதார்',
            enter_email: 'your@email.com',
            enter_state: 'எ.கா., தமிழ்நாடு',
            enter_age: 'ஆண்டுகளில் வயது',
            enter_occ: 'எ.கா., விவசாயி, மாணவர்',
            enter_income: 'எண் தொகையை உள்ளிடவும்',
            enter_captcha: 'கேப்ட்சாவை உள்ளிடவும்',
            app_submitted: 'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!',
            app_forwarded: 'கோரப்பட்ட திட்டத்திற்கான உங்கள் விண்ணப்பம் சம்பந்தப்பட்ட துறைக்கு வெற்றிகரமாக அனுப்பப்பட்டது.',
            return_home: 'முகப்புக்குத் திரும்பு',
            enter_phone: '+91'
        },
        'te': {
            verifyUpload: 'మీ పత్రం నుండి నేను {value} అనే పేరును కనుగొన్నాను. ఇది సరైనదేనా? అవును లేదా కాదు అని చెప్పండి.',
            back: 'వెనక్కి',
            stop_assistant: 'అసిస్టెంట్‌ను ఆపు',
            auto_fill: 'వాయిస్ ద్వారా ఆటో-ఫిల్',
            official_form: 'అధికారిక ధృవీకరణ మరియు దరఖాస్తు ఫారమ్',
            full_name: 'పూర్తి పేరు',
            aadhar_num: 'ఆధార్ నంబర్',
            mobile_num: 'మొబైల్ నంబర్',
            email: 'ఇమెయిల్ చిరునామా',
            state: 'రాష్ట్రం',
            age: 'వయస్సు',
            occupation: 'వృత్తి',
            annual_income: 'వార్షిక ఆదాయం (₹)',
            required_docs: 'అవసరమైన పత్రాలు',
            upload_docs_text: 'మీ అర్హతకు మద్దతు ఇవ్వడానికి అవసరమైన పత్రాల స్కాన్ చేసిన కాపీలను అప్‌లోడ్ చేయండి.',
            aadhaar_card: 'ఆధార్ కార్డు',
            id_proof: 'గుర్తింపు మరియు చిరునామా రుజువు',
            income_proof: 'ఆదాయం/వృత్తి రుజువు',
            valid_cert: 'ఇటీవలి చెల్లుబాటు అయ్యే సర్టిఫికేట్',
            submit_app: 'దరఖాస్తు సమర్పించండి',
            verify_phone: 'ఫోన్ నంబర్ ధృవీకరించండి',
            verify: 'ధృవీకరించండి',
            listening: 'వింటోంది...',
            confirming: 'నిర్ధారిస్తోంది...',
            enter_name: 'మీ పూర్తి పేరు నమోదు చేయండి',
            enter_aadhar: '12 అంకెల ఆధార్',
            enter_email: 'your@email.com',
            enter_state: 'ఉదా., ఆంధ్రప్రదేశ్',
            enter_age: 'వయస్సు',
            enter_occ: 'ఉదా., రైతు, విద్యార్థి',
            enter_income: 'వార్షిక ఆదాయం నమోదు చేయండి',
            enter_captcha: 'క్యాప్చా నమోదు చేయండి',
            app_submitted: 'దరఖాస్తు సమర్పించబడింది!',
            app_forwarded: 'అభ్యర్థించిన పథకం కోసం మీ దరఖాస్తు విజయవంతంగా పంపబడింది.',
            return_home: 'హోమ్‌కు తిరిగి వెళ్ళు',
            enter_phone: '+91'
        },
        'kn': {
            verifyUpload: 'ನಿಮ್ಮ ಡಾಕ್ಯುಮೆಂಟ್‌ನಿಂದ ನಾನು {value} ಹೆಸರನ್ನು ಕಂಡುಕೊಂಡಿದ್ದೇನೆ. ಇದು ಸರಿಯೇ? ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಹೇಳಿ.',
            back: 'ಹಿಂದೆ',
            stop_assistant: 'ಸಹಾಯಕವನ್ನು ನಿಲ್ಲಿಸಿ',
            auto_fill: 'ಧ್ವನಿ ಮೂಲಕ ಸ್ವಯಂ ಭರ್ತಿ',
            official_form: 'ಅಧಿಕೃತ ಪರಿಶೀಲನೆ ಮತ್ತು ಅರ್ಜಿ ನಮೂನೆ',
            full_name: 'ಪೂರ್ಣ ಹೆಸರು',
            aadhar_num: 'ಆಧಾರ್ ಸಂಖ್ಯೆ',
            mobile_num: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
            email: 'ಇಮೇಲ್ ವಿಳಾಸ',
            state: 'ರಾಜ್ಯ',
            age: 'ವಯಸ್ಸು',
            occupation: 'ಉದ್ಯೋಗ',
            annual_income: 'ವಾರ್ಷಿಕ ಆದಾಯ (₹)',
            required_docs: 'ಅಗತ್ಯ ದಾಖಲೆಗಳು',
            upload_docs_text: 'ದಯವಿಟ್ಟು ಅಗತ್ಯ ದಾಖಲೆಗಳ ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪ್ರತಿಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
            aadhaar_card: 'ಆಧಾರ್ ಕಾರ್ಡ್',
            id_proof: 'ಗುರುತು ಮತ್ತು ವಿಳಾಸ ಪುರಾವೆ',
            income_proof: 'ಆದಾಯ/ಉದ್ಯೋಗ ಪುರಾವೆ',
            valid_cert: 'ಇತ್ತೀಚಿನ ಮಾನ್ಯ ಪ್ರಮಾಣಪತ್ರ',
            submit_app: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
            verify_phone: 'ಫೋನ್ ಸಂಖ್ಯೆ ಪರಿಶೀಲಿಸಿ',
            verify: 'ಪರಿಶೀಲಿಸಿ',
            listening: 'ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
            confirming: 'ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
            enter_name: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
            enter_aadhar: '12 ಅಂಕಿಯ ಆಧಾರ್',
            enter_email: 'your@email.com',
            enter_state: 'ಉದಾ., ಕರ್ನಾಟಕ',
            enter_age: 'ವಯಸ್ಸು',
            enter_occ: 'ಉದಾ., ರೈತ, ವಿದ್ಯಾರ್ಥಿ',
            enter_income: 'ಆದಾಯ ನಮೂದಿಸಿ',
            enter_captcha: 'ಕ್ಯಾಪ್ಚಾ ನಮೂದಿಸಿ',
            app_submitted: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!',
            app_forwarded: 'ವಿನಂತಿಸಿದ ಯೋಜನೆಗಾಗಿ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ.',
            return_home: 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
            enter_phone: '+91'
        },
        'ml': {
            verifyUpload: 'നിങ്ങളുടെ രേഖയിൽ നിന്ന് ഞാൻ {value} എന്ന പേര് കണ്ടെത്തി. ഇത് ശരിയാണോ? അതെ അല്ലെങ്കിൽ അല്ല എന്ന് പറയുക.',
            back: 'തിരികെ',
            stop_assistant: 'അസിസ്റ്റന്റ് നിർത്തുക',
            auto_fill: 'ശബ്ദം ഉപയോഗിച്ച് പൂരിപ്പിക്കുക',
            official_form: 'ഔദ്യോഗിക സ്ഥിരീകരണം & അപേക്ഷാ ഫോം',
            full_name: 'മുഴുവൻ പേര്',
            aadhar_num: 'ആധാർ നമ്പർ',
            mobile_num: 'മൊബൈൽ നമ്പർ',
            email: 'ഇമെയിൽ വിലാസം',
            state: 'സംസ്ഥാനം',
            age: 'പ്രായം',
            occupation: 'തൊഴിൽ',
            annual_income: 'വാർഷിക വരുമാനം (₹)',
            required_docs: 'ആവശ്യമായ രേഖകൾ',
            upload_docs_text: 'ആവശ്യമായ രേഖകളുടെ പകർപ്പുകൾ അപ്‌ലോഡ് ചെയ്യുക.',
            aadhaar_card: 'ആധാർ കാർഡ്',
            id_proof: 'തിരിച്ചറിയൽ & വിലാസ രേഖ',
            income_proof: 'വരുമാന/തൊഴിൽ രേഖ',
            valid_cert: 'അടുത്തിടെയുള്ള സർട്ടിഫിക്കറ്റ്',
            submit_app: 'അപേക്ഷ സമർപ്പിക്കുക',
            verify_phone: 'ഫോൺ നമ്പർ പരിശോധിക്കുക',
            verify: 'പരിശോധിക്കുക',
            listening: 'കേൾക്കുന്നു...',
            confirming: 'സ്ഥിരീകരിക്കുന്നു...',
            enter_name: 'നിങ്ങളുടെ പേര് നൽകുക',
            enter_aadhar: '12 അക്ക ആധാർ',
            enter_email: 'your@email.com',
            enter_state: 'ഉദാ., കേരളം',
            enter_age: 'പ്രായം',
            enter_occ: 'ഉദാ., കർഷകൻ, വിദ്യാർത്ഥി',
            enter_income: 'വരുമാനം നൽകുക',
            enter_captcha: 'ക്യാപ്‌ച നൽകുക',
            app_submitted: 'അപേക്ഷ സമർപ്പിച്ചു!',
            app_forwarded: 'നിങ്ങളുടെ അപേക്ഷ ബന്ധപ്പെട്ട വകുപ്പിന് വിജയകമായി കൈമാറി.',
            return_home: 'ഹോം പേജിലേക്ക് മടങ്ങുക',
            enter_phone: '+91'
        },
        'bn': {
            verifyUpload: 'আমি আপনার নথি থেকে {value} নামটি পেয়েছি। এটা কি ঠিক? হ্যাঁ বা না বলুন।',
            back: 'ফিরে যান',
            stop_assistant: 'সহকারী থামান',
            auto_fill: 'ভয়েস দ্বারা অটো-ফিল করুন',
            official_form: 'অফিসিয়াল যাচাইকরণ এবং আবেদন ফর্ম',
            full_name: 'পুরো নাম',
            aadhar_num: 'আধার নম্বর',
            mobile_num: 'মোবাইল নম্বর',
            email: 'ইমেইল ঠিকানা',
            state: 'রাজ্য',
            age: 'বয়স',
            occupation: 'পেশা',
            annual_income: 'বার্ষিক আয় (₹)',
            required_docs: 'প্রয়োজনীয় নথিপত্র',
            upload_docs_text: 'আপনার যোগ্যতার সমর্থনে প্রয়োজনীয় নথির স্ক্যান কপি আপলোড করুন।',
            aadhaar_card: 'আধার কার্ড',
            id_proof: 'পরিচয় ও প্রমাণপত্র',
            income_proof: 'আয়/পেশার প্রমাণ',
            valid_cert: 'সাম্প্রতিক বৈধ শংসাপত্র',
            submit_app: 'আবেদন জমা দিন',
            verify_phone: 'ফোন নম্বর যাচাই করুন',
            verify: 'যাচাই করুন',
            listening: 'শুনছি...',
            confirming: 'নিশ্চিত করা হচ্ছে...',
            enter_name: 'আপনার পুরো নাম লিখুন',
            enter_aadhar: '১২ অঙ্কের আধার',
            enter_email: 'your@email.com',
            enter_state: 'উদাঃ পশ্চিমবঙ্গ',
            enter_age: 'বয়স',
            enter_occ: 'উদাঃ কৃষক, ছাত্র',
            enter_income: 'আয়ের পরিমাণ লিখুন',
            enter_captcha: 'ক্যাপচা লিখুন',
            app_submitted: 'আবেদন জমা দেওয়া হয়েছে!',
            app_forwarded: 'আপনার আবেদনটি সংশ্লিষ্ট বিভাগে সফলভাবে পাঠানো হয়েছে।',
            return_home: 'হোমে ফিরে যান',
            enter_phone: '+91'
        },
        'mr': {
            verifyUpload: 'मला तुमच्या दस्तऐवजातून {value} हे नाव सापडले. हे बरोबर आहे का? हो किंवा नाही सांगा.',
            back: 'मागे',
            stop_assistant: 'सहाय्यक थांबवा',
            auto_fill: 'आवाजाद्वारे ऑटो-फिल',
            official_form: 'अधिकृत पडताळणी आणि अर्ज',
            full_name: 'पूर्ण नाव',
            aadhar_num: 'आधार क्रमांक',
            mobile_num: 'मोबाईल क्रमांक',
            email: 'ईमेल पत्ता',
            state: 'राज्य',
            age: 'वय',
            occupation: 'व्यवसाय',
            annual_income: 'वार्षिक उत्पन्न (₹)',
            required_docs: 'आवश्यक कागदपत्रे',
            upload_docs_text: 'आपल्या पात्रतेचे समर्थन करण्यासाठी आवश्यक कागदपत्रांच्या स्कॅन केलेल्या प्रती अपलोड करा.',
            aadhaar_card: 'आधार कार्ड',
            id_proof: 'ओळख आणि पत्ता पुरावा',
            income_proof: 'उत्पन्न/व्यवसायाचा पुरावा',
            valid_cert: 'अलीकडील वैध प्रमाणपत्र',
            submit_app: 'अर्ज जमा करा',
            verify_phone: 'फोन नंबर सत्यापित करा',
            verify: 'सत्यापित करा',
            listening: 'ऐकत आहे...',
            confirming: 'पुष्टी करत आहे...',
            enter_name: 'आपले पूर्ण नाव प्रविष्ट करा',
            enter_aadhar: '१२ अंकी आधार',
            enter_email: 'your@email.com',
            enter_state: 'उदा., महाराष्ट्र',
            enter_age: 'वय',
            enter_occ: 'उदा., शेतकरी, विद्यार्थी',
            enter_income: 'उत्पन्नाची रक्कम प्रविष्ट करा',
            enter_captcha: 'कॅप्चा प्रविष्ट करा',
            app_submitted: 'अर्ज जमा झाला!',
            app_forwarded: 'आपला अर्ज संबंधित विभागाकडे यशस्वीरित्या पाठविला गेला आहे.',
            return_home: 'मुख्यपृष्ठावर परत जा',
            enter_phone: '+91'
        },
        'gu': {
            verifyUpload: 'મને તમારા દસ્તાવેજમાંથી {value} નામ મળ્યું. શું આ સાચું છે? હા કે ના કહો.',
            back: 'પાછા જાઓ',
            stop_assistant: 'સહાયક બંધ કરો',
            auto_fill: 'અવાજ દ્વારા ઓટો-ફિલ',
            official_form: 'સત્તાવાર ચકાસણી અને અરજી ફોર્મ',
            full_name: 'પૂરું નામ',
            aadhar_num: 'આધાર નંબર',
            mobile_num: 'મોબાઇલ નંબર',
            email: 'ઇમેઇલ સરનામું',
            state: 'રાજ્ય',
            age: 'ઉંમર',
            occupation: 'વ્યવસાય',
            annual_income: 'વાર્ષિક આવક (₹)',
            required_docs: 'જરૂરી દસ્તાવેજો',
            upload_docs_text: 'કૃપા કરીને તમારી પાત્રતાને સમર્થન આપવા માટે જરૂરી દસ્તાવેજોની સ્કેન કરેલી નકલો અપલોડ કરો.',
            aadhaar_card: 'આધાર કાર્ડ',
            id_proof: 'ઓળખ અને સરનામાનો પુરાવો',
            income_proof: 'આવક/વ્યવસાયનો પુરાવો',
            valid_cert: 'તાજેતરનું માન્ય પ્રમાણપત્ર',
            submit_app: 'અરજી સબમિટ કરો',
            verify_phone: 'ફોન નંબર ચકાસો',
            verify: 'ચકાસો',
            listening: 'સાંભળી રહ્યા છીએ...',
            confirming: 'પુષ્ટિ કરી રહ્યા છીએ...',
            enter_name: 'તમારું પૂરું નામ દાખલ કરો',
            enter_aadhar: '12 અંકનો આધાર',
            enter_email: 'your@email.com',
            enter_state: 'દા.ત., ગુજરાત',
            enter_age: 'ઉંમર',
            enter_occ: 'દા.ત., ખેડૂત, વિદ્યાર્થી',
            enter_income: 'આવકની રકમ દાખલ કરો',
            enter_captcha: 'કેપ્ચા દાખલ કરો',
            app_submitted: 'અરજી સબમિટ થઈ!',
            app_forwarded: 'તમારી અરજી સફળતાપૂર્વક સંબંધિત વિભાગને મોકલવામાં આવી છે.',
            return_home: 'હોમ પર પાછા ફરો',
            enter_phone: '+91'
        }
    };
    const tf = formTranslations[lang] || formTranslations['en'];

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-india-green" />
                    </div>
                    <h2 className="text-2xl font-black text-india-navy mb-2">{tf.app_submitted}</h2>
                    <p className="text-gray-600 mb-8">{tf.app_forwarded}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-india-saffron text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg w-full"
                    >
                        {tf.return_home}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => {
                            window.speechSynthesis.cancel();
                            navigate(-1);
                        }}
                        className="flex items-center text-gray-500 hover:text-india-navy transition-colors font-semibold"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> {tf.back}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (isAssisting) {
                                setIsAssisting(false);
                                setListeningToField(null);
                                setConfirmingField(null);
                                window.speechSynthesis.cancel();
                            } else {
                                startVoiceAssistant();
                            }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${isAssisting ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                    >
                        {isAssisting ? (
                            <><MicOff className="w-4 h-4" /> {tf.stop_assistant}</>
                        ) : (
                            <><Bot className="w-4 h-4 text-blue-600" /> {tf.auto_fill}</>
                        )}
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-india-navy p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <FileText className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black mb-1 leading-tight">{schemeName}</h1>
                                <p className="text-white/80 font-medium text-sm">{tf.official_form}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-india-saffron" /> {tf.full_name}
                                </label>
                                <input
                                    required
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'fullName' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'fullName' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'fullName' ? tf.listening : confirmingField === 'fullName' ? tf.confirming : tf.enter_name}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-india-saffron" /> {tf.aadhar_num}
                                </label>
                                <input
                                    required
                                    name="aadharNumber"
                                    value={formData.aadharNumber}
                                    onChange={handleChange}
                                    maxLength="12"
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'aadharNumber' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'aadharNumber' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'aadharNumber' ? tf.listening : confirmingField === 'aadharNumber' ? tf.confirming : tf.enter_aadhar}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-india-saffron" /> {tf.mobile_num}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        disabled={isPhoneVerified}
                                        className={`flex-1 border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'phone' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'phone' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : isPhoneVerified ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                        placeholder={listeningToField === 'phone' ? tf.listening : confirmingField === 'phone' ? tf.confirming : tf.enter_phone}
                                    />
                                    {isPhoneVerified && (
                                        <div className="bg-green-100 text-green-700 px-4 flex items-center justify-center rounded-xl border border-green-200">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                {!isPhoneVerified && formData.phone.length >= 10 && (
                                    <div className="mt-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                                        <div className="text-xs font-bold text-blue-800 flex items-center justify-between">
                                            <span>{tf.verify_phone}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white border rounded px-3 py-2 font-mono font-bold tracking-widest text-lg flex-1 text-center select-none shadow-inner text-gray-700 line-through decoration-gray-400 decoration-2">
                                                {captcha}
                                            </div>
                                            <button type="button" onClick={generateCaptcha} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-500 transition-colors" title="Refresh Captcha">
                                                <RefreshCw className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                name="captchaInput"
                                                value={formData.captchaInput}
                                                onChange={handleChange}
                                                placeholder={tf.enter_captcha}
                                                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-india-navy"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyPhone}
                                                className="bg-india-navy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-all flex items-center gap-1"
                                            >
                                                <Shield className="w-4 h-4" /> {tf.verify}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-india-saffron" /> {tf.email}
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'email' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'email' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'email' ? tf.listening : confirmingField === 'email' ? tf.confirming : tf.enter_email}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-india-saffron" /> {tf.state}
                                </label>
                                <input
                                    required
                                    name="stateLoc"
                                    value={formData.stateLoc}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'stateLoc' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'stateLoc' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'stateLoc' ? tf.listening : confirmingField === 'stateLoc' ? tf.confirming : tf.enter_state}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-india-saffron" /> {tf.age}
                                </label>
                                <input
                                    required
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'age' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'age' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'age' ? tf.listening : confirmingField === 'age' ? tf.confirming : tf.enter_age}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-india-saffron" /> {tf.occupation}
                                </label>
                                <input
                                    required
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'occupation' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'occupation' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'occupation' ? tf.listening : confirmingField === 'occupation' ? tf.confirming : tf.enter_occ}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-india-saffron" /> {tf.annual_income}
                                </label>
                                <input
                                    type="number"
                                    name="income"
                                    value={formData.income}
                                    onChange={handleChange}
                                    className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${listeningToField === 'income' ? 'bg-orange-50 border-india-saffron ring-2 ring-india-saffron/20' : confirmingField === 'income' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : 'bg-gray-50 border-gray-200 focus:border-india-navy focus:ring-2 focus:ring-india-navy/20'}`}
                                    placeholder={listeningToField === 'income' ? tf.listening : confirmingField === 'income' ? tf.confirming : tf.enter_income}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-4 pt-6 mt-4 border-t border-gray-100">
                                <h3 className="text-lg font-bold text-india-navy flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-india-saffron" /> {tf.required_docs}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">{tf.upload_docs_text}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {reqDocs.includes('aadhaar') && (
                                        <div className="border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center bg-gray-50 transition-colors relative min-h-[160px]">
                                            {capturedDocs.aadhaar ? (
                                                <div className="w-full text-center relative group flex flex-col items-center">
                                                    <img src={capturedDocs.aadhaar} className="w-full h-24 object-contain mb-2 rounded-lg" alt="Aadhaar captured" />
                                                    <div className="absolute top-0 right-0 p-1 bg-white rounded-full translate-x-1 -translate-y-1 shadow-md">
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </div>
                                                    <div className="flex flex-col gap-2 mt-2 w-full">
                                                        <button
                                                            type="button"
                                                            onClick={() => extractAadharDetails(capturedDocs.aadhaar)}
                                                            disabled={isScanningDoc}
                                                            className="text-xs font-bold px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1 w-full disabled:opacity-70 disabled:cursor-not-allowed"
                                                        >
                                                            {isScanningDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                                            {isScanningDoc ? 'Scanning...' : 'Auto-Fill from Aadhaar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCapturedDocs(prev => ({ ...prev, aadhaar: null }))}
                                                            className="text-xs text-red-500 font-bold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors w-full"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="font-bold text-sm text-gray-700">{tf.aadhaar_card}</p>
                                                    <div className="flex gap-2 mb-1 w-full justify-center px-2 mt-2">
                                                        <button type="button" onClick={() => { setCurrentDocType('aadhaar'); setCameraOpen(true); }} className="flex-1 py-2 bg-india-navy text-white rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-blue-900 shadow-sm transition-colors">
                                                            <Camera className="w-4 h-4" /> Camera
                                                        </button>
                                                        <label className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-gray-300 shadow-sm cursor-pointer transition-colors text-center relative overflow-hidden">
                                                            Upload
                                                            <input type="file" required={!capturedDocs.aadhaar} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'aadhaar')} />
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {reqDocs.includes('income') && (
                                        <div className="border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center bg-gray-50 transition-colors relative min-h-[160px]">
                                            {capturedDocs.income ? (
                                                <div className="w-full text-center relative group flex flex-col items-center">
                                                    <img src={capturedDocs.income} className="w-full h-24 object-contain mb-2 rounded-lg" alt="Income captured" />
                                                    <div className="absolute top-0 right-0 p-1 bg-white rounded-full translate-x-1 -translate-y-1 shadow-md">
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </div>
                                                    <button type="button" onClick={() => setCapturedDocs(prev => ({ ...prev, income: null }))} className="text-xs text-red-500 mt-2 font-bold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Remove</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="font-bold text-sm text-gray-700">{tf.income_proof}</p>
                                                    <div className="flex gap-2 mb-1 w-full justify-center px-2 mt-2">
                                                        <button type="button" onClick={() => { setCurrentDocType('income'); setCameraOpen(true); }} className="flex-1 py-2 bg-india-navy text-white rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-blue-900 shadow-sm transition-colors">
                                                            <Camera className="w-4 h-4" /> Camera
                                                        </button>
                                                        <label className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-gray-300 shadow-sm cursor-pointer transition-colors text-center">
                                                            Upload
                                                            <input type="file" required={!capturedDocs.income} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'income')} />
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {reqDocs.includes('birth') && (
                                        <div className="border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center bg-gray-50 transition-colors relative min-h-[160px]">
                                            {capturedDocs.birth ? (
                                                <div className="w-full text-center relative group flex flex-col items-center">
                                                    <img src={capturedDocs.birth} className="w-full h-24 object-contain mb-2 rounded-lg" alt="Birth Certificate captured" />
                                                    <div className="absolute top-0 right-0 p-1 bg-white rounded-full translate-x-1 -translate-y-1 shadow-md">
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </div>
                                                    <button type="button" onClick={() => setCapturedDocs(prev => ({ ...prev, birth: null }))} className="text-xs text-red-500 mt-2 font-bold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Remove</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="font-bold text-sm text-gray-700">{tf.birth_cert || 'Birth Certificate'}</p>
                                                    <div className="flex gap-2 mb-1 w-full justify-center px-2 mt-2">
                                                        <button type="button" onClick={() => { setCurrentDocType('birth'); setCameraOpen(true); }} className="flex-1 py-2 bg-india-navy text-white rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-blue-900 shadow-sm transition-colors">
                                                            <Camera className="w-4 h-4" /> Camera
                                                        </button>
                                                        <label className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center gap-1 text-xs font-bold hover:bg-gray-300 shadow-sm cursor-pointer transition-colors text-center">
                                                            Upload
                                                            <input type="file" required={!capturedDocs.birth} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, 'birth')} />
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                className="bg-india-green text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center gap-2 group w-full md:w-auto justify-center"
                            >
                                {tf.submit_app}
                                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {cameraOpen && (
                <CameraCapture
                    docType={currentDocType}
                    onCapture={handleCapture}
                    onClose={() => { setCameraOpen(false); setCurrentDocType(null); }}
                />
            )}
        </div>
    );
};

export default ApplicationForm;
