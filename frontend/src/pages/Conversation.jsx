import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, User, Bot, CheckCircle, ChevronRight, Info, Mic, MicOff, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { languageMap } from '../utils/translations';

const Conversation = ({ globalLanguage, setGlobalLanguage }) => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [userProfile, setUserProfile] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    const language = globalLanguage || 'en';

    useEffect(() => {
        if (state?.initialMessage) {
            handleSendMessage(state.initialMessage);
        }
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const [isListening, setIsListening] = useState(false);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = languageMap[language] || 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
            // Optionally auto-send immediately
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
                language: language,
                userProfile: userProfile
            });

            const { reply, extractedInfo, profileComplete, suggestedSchemes } = response.data;

            setMessages([...newMessages, { role: 'bot', text: reply, schemes: suggestedSchemes }]);
            setUserProfile(prev => ({ ...prev, ...extractedInfo }));

            window.speechSynthesis.cancel(); // Stop any currently playing audio so new message doesn't overlap
            speakText(reply, languageMap[language] || 'en-IN');

            if (profileComplete || Object.keys({ ...userProfile, ...extractedInfo }).length >= 4) {
                setTimeout(() => {
                    const nextMsg = "I have gathered enough information! Let's see your eligible schemes.";
                    setMessages(prev => [...prev, { role: 'bot', text: nextMsg }]);
                    speakText(nextMsg, 'en-IN');
                }, 1000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const completionPercentage = Math.min(100, (Object.keys(userProfile).length / 4) * 100);

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

    return (
        <div className="flex h-[calc(100vh-80px)] bg-[#E5DDD5]">
            {/* Sidebar - Profile Progress */}
            <div className="hidden lg:flex w-80 bg-white border-r border-gray-200 flex-col p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-india-navy flex items-center gap-2">
                        <User className="w-5 h-5" /> Your Profile
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercentage}%` }}
                            className="bg-india-green h-2.5 rounded-full"
                        />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{completionPercentage}% Completed</p>
                </div>

                <div className="space-y-4">
                    {['age', 'income', 'occupation', 'state'].map(field => (
                        <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="capitalize text-gray-600 text-sm">{field}</span>
                            {userProfile[field] ? (
                                <span className="text-india-green font-bold text-sm">{userProfile[field]}</span>
                            ) : (
                                <span className="text-gray-400 text-xs italic">Pending</span>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/results', { state: { userProfile, language } })}
                    className="w-full py-4 bg-india-saffron text-white font-bold rounded-2xl shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                >
                    View Schemes <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-[#E5DDD5]">
                {/* Chat Header */}
                <div className="bg-[#F0F2F5] border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-india-green/10 p-2 rounded-full">
                            <Bot className="w-5 h-5 text-india-green" />
                        </div>
                        <div>
                            <h2 className="font-bold text-india-navy text-sm md:text-base">Schema Assistant</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Online</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <AnimatePresence>
                        {messages.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${m.role === 'user'
                                    ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'
                                    }`}>
                                    <p className="text-sm md:text-base leading-relaxed">{m.text}</p>

                                    {m.schemes && m.schemes.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {m.schemes.map((s, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => navigate('/apply', { state: { scheme: s, userProfile, language } })}
                                                    className="p-3 border border-india-saffron/20 rounded-xl bg-orange-50/50 hover:bg-orange-100 cursor-pointer shadow-sm flex flex-col gap-2 group transition-all"
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="font-bold text-sm text-india-navy flex-1 line-clamp-2">{s.name}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${s.eligibilityStatus?.includes('Eligible') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                            {s.eligibilityStatus || 'Check Eligibility'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-india-saffron font-semibold mt-1">
                                                        Apply Now <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Bar */}
                <div className="bg-[#F0F2F5] p-4 flex items-center gap-4">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isListening ? "Listening..." : "Type a message..."}
                        className="flex-1 bg-white p-3 rounded-full outline-none shadow-inner border border-gray-200"
                        disabled={isListening}
                    />
                    <button
                        onClick={startListening}
                        disabled={isListening}
                        className={`${isListening ? 'bg-red-500 animate-pulse' : 'bg-india-saffron hover:bg-orange-600'} p-3 rounded-full text-white transition-all shadow-md disabled:bg-red-500 disabled:opacity-50`}
                    >
                        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button
                        onClick={() => handleSendMessage()}
                        className="bg-india-navy p-3 rounded-full text-white hover:bg-black transition-all shadow-md"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Conversation;
