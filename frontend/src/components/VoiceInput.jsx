import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceInput = ({ onTranscript, language = 'en-IN' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            setIsProcessing(true);
            setTimeout(() => {
                onTranscript(transcript);
                setIsProcessing(false);
            }, 1000);
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Please allow microphone access to use voice input.');
            } else {
                alert('Voice recognition error: ' + event.error);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                {isListening && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: [0.2, 0.5, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 bg-india-saffron rounded-full blur-xl"
                    />
                )}

                <button
                    onClick={startListening}
                    disabled={isProcessing}
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-red-500 scale-110' : 'bg-india-saffron hover:bg-orange-600'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isProcessing ? (
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : isListening ? (
                        <Mic className="w-10 h-10 text-white" />
                    ) : (
                        <Mic className="w-10 h-10 text-white animate-breathing" />
                    )}
                </button>
            </div>

            <div className="flex gap-1 h-8 items-center">
                {isListening ? (
                    [...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ height: [8, 24, 8] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                            className={`w-1 rounded-full ${i % 3 === 0 ? 'bg-india-saffron' : i % 3 === 1 ? 'bg-gray-400' : 'bg-india-green'
                                }`}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 font-medium">
                        {isProcessing ? "Processing your voice..." : "Tap the microphone to speak"}
                    </p>
                )}
            </div>
        </div>
    );
};

export default VoiceInput;
