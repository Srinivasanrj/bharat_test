import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, User, Bot, Loader2, ArrowRight, Mic, MicOff, Pause, Square, Play, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { languageMap } from '../utils/translations';

const FloatingChat = ({ language }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [userProfile, setUserProfile] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef(null);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = languageMap[language || 'en'] || 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
            handleSendMessage(transcript);
        };

        recognition.onerror = (event) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Please allow microphone access to use voice input.');
            } else {
                alert('Voice recognition error: ' + event.error);
            }
        };
        recognition.onend = () => setIsListening(false);

        try {
            recognition.start();
        } catch (e) {
            console.error("Speech recognition error:", e);
            setIsListening(false);
        }
    };

    useEffect(() => {
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('open-chat', handleOpenChat);
        return () => window.removeEventListener('open-chat', handleOpenChat);
    }, []);

    useEffect(() => {
        setMessages([]);
        setUserProfile({});
    }, [language]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcomeMap = {
                'en': "Namaste! How can I help you today?",
                'hi': "नमस्ते! मैं आपकी कैसे सहायता कर सकता हूँ?",
                'ta': "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?",
                'te': "నమస్తే! నేను మీకు ఎలా సహాయం చేయగలను?",
                'kn': "ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
                'ml': "നമസ്കാരം! എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?",
                'bn': "নমস্কার! আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
                'mr': "नमस्ते! मी तुम्हाला कशी मदत करू शकतो?",
                'gu': "નમસ્તે! હું તમને કેવી રીતે મદદ કરી શકું?",
                'bho': "प्रणाम! हम रउआ कइसे मदद कर सकत बानी?",
                'sa': "नमो नमः! अहम् भवतः कथम् साहाय्यम् करवाणि?",
                'mai': "प्रणाम! हम अहाँक कोना मदद क सकैत छी?",
                'kok': "नमस्कार! हांव तुमची कशी मदत करूं शकता?",
                'doi': "नमस्ते! मैं तुंदी किवें मदद करी सकदा आं?",
                'sd': "نمستي! مان توهان جي ڪيئن مدد ڪري سگهان ٿو؟",
                'ks': "سلام! بہ کِتھ کٔنؠ ہٮ۪کہِ تُہنٛز مَدَتھ کٔرِتھ؟",
                'ne': "नमस्ते! म तपाईंलाई कसरी मद्दत गर्न सक्छु?"
            };
            const currentLang = language || 'en';
            const welcomeMsg = welcomeMap[currentLang] || welcomeMap['en'];
            setMessages([{ role: 'bot', text: welcomeMsg }]);
            speakText(welcomeMsg, languageMap[currentLang] || 'en-IN');
        }
    }, [isOpen, language]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (msg) => {
        const text = msg || input;
        if (!text.trim()) return;

        const newMessages = [...messages, { role: 'user', text }];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/conversation/message', {
                message: text,
                history: messages,
                language: language || 'en',
                userProfile: userProfile
            });

            const { reply, extractedInfo, profileComplete, suggestedSchemes, isAppointmentIntent } = response.data;

            setMessages([...newMessages, { role: 'bot', text: reply, schemes: suggestedSchemes, isAppointmentIntent }]);
            setUserProfile(prev => ({ ...prev, ...extractedInfo }));

            // Cancel previous speech when new message is received to prevent overlapping
            stopSpeaking();
            speakText(reply, languageMap[language || 'en'] || 'en-IN');

            if (profileComplete) {
                const nextMsg = "Ready to see your eligible schemes? Just click the button below!";
                setMessages(prev => [...prev, { role: 'bot', text: nextMsg }]);
                speakText(nextMsg, 'en-IN');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const speakText = (text, langCode) => {
        if (!window.speechSynthesis) return;

        // Keep utterances in global scope to prevent garbage collection bug in Chrome
        window.__speechUtterances = window.__speechUtterances || [];

        let cleanText = text.replace(/[*#_`~]/g, "").trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;

        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(langCode.substring(0, 2)));
        if (voice) utterance.voice = voice;

        window.__speechUtterances.push(utterance);

        // Clear array occasionally to prevent memory leak
        if (window.__speechUtterances.length > 10) {
            window.__speechUtterances = window.__speechUtterances.slice(-5);
        }

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => window.speechSynthesis.cancel();
    const pauseSpeaking = () => window.speechSynthesis.pause();
    const resumeSpeaking = () => window.speechSynthesis.resume();

    const handleCloseChat = () => {
        setIsOpen(false);
        stopSpeaking();
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="mb-4 w-80 md:w-96 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[500px]"
                    >
                        {/* Header */}
                        <div className="bg-india-navy p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Mitra AI</h3>
                                    <p className="text-[10px] text-white/70 tracking-widest uppercase">Always Online</p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <button onClick={pauseSpeaking} className="hover:bg-white/10 p-1 rounded-full transition-colors" title="Pause Voice">
                                    <Pause className="w-4 h-4 text-white" />
                                </button>
                                <button onClick={stopSpeaking} className="hover:bg-white/10 p-1 rounded-full transition-colors" title="Stop Voice">
                                    <Square className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={handleCloseChat}
                                    className="hover:bg-white/10 p-1 rounded-full transition-colors"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${m.role === 'user'
                                        ? 'bg-gov-indigo text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                        }`}>
                                        <p className="leading-relaxed">{m.text}</p>
                                        {m.schemes && m.schemes.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {m.schemes.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate('/apply', { state: { scheme: s, userProfile, language: language || 'en' } });
                                                            setIsOpen(false);
                                                        }}
                                                        className="p-2 border border-india-saffron/30 rounded-lg bg-orange-50/50 hover:bg-orange-100 cursor-pointer transition-colors shadow-sm flex items-center justify-between group flex-wrap"
                                                    >
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="font-bold text-xs text-india-navy flex-1 line-clamp-1">{s.name}</span>
                                                                <ArrowRight className="w-3 h-3 text-india-saffron opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                                                            </div>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${s.eligibilityStatus?.includes('Eligible') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {s.eligibilityStatus || 'Check Eligibility'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {m.isAppointmentIntent && (
                                            <div className="mt-3">
                                                <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-india-saffron text-white text-xs font-bold rounded-xl shadow-md hover:bg-orange-600 transition-colors w-full justify-center text-center">
                                                    <Globe className="w-4 h-4" /> Book Document Appointment
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <Loader2 className="w-4 h-4 text-india-navy animate-spin" />
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        {/* Profile Progress */}
                        {Object.keys(userProfile).length > 0 && (
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profile Match</span>
                                    <span className="text-[10px] font-bold text-india-green">{Math.min(100, (Object.keys(userProfile).length / 4) * 100)}%</span>
                                </div>
                                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(Object.keys(userProfile).length / 4) * 100}%` }}
                                        className="h-full bg-india-green"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isListening ? "Listening..." : "Type your query..."}
                                className="flex-1 bg-gray-100 p-2 rounded-xl outline-none text-sm placeholder:text-gray-400"
                                disabled={isListening}
                            />
                            <button
                                onClick={startListening}
                                disabled={isListening}
                                className={`${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-xl transition-all shadow-sm border border-gray-200 disabled:opacity-50`}
                            >
                                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => handleSendMessage()}
                                className="bg-india-saffron p-2 rounded-xl text-white hover:bg-orange-600 transition-all shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all ${isOpen ? 'bg-gov-amber' : 'bg-india-navy'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.button>
        </div>
    );
};

export default FloatingChat;
