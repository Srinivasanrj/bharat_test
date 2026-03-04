import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Phone, ChevronRight, Fingerprint, Lock } from 'lucide-react';

const Login = ({ lang, onLogin }) => {
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // some simple translations based on tang
    const text = {
        en: {
            secureLogin: "Secure Citizen Login",
            subtitle: "Access government services using Mobile No. or Aadhaar",
            phoneLabel: "Mobile Number",
            sendOtp: "Send OTP",
            verify: "Verify OTP",
            resend: "Change Number",
            enterOtp: "Enter the code sent to your phone"
        },
        hi: {
            secureLogin: "सुरक्षित नागरिक लॉगिन",
            subtitle: "मोबाइल नंबर या आधार का उपयोग करके सरकारी सेवाओं तक पहुंचें",
            phoneLabel: "मोबाइल नंबर",
            sendOtp: "OTP भेजें",
            verify: "OTP सत्यापित करें",
            resend: "नंबर बदलें",
            enterOtp: "अपने फोन पर भेजा गया कोड दर्ज करें"
        },
        ta: {
            secureLogin: "பாதுகாப்பான குடிமக்கள் உள்நுழைவு",
            subtitle: "மொபைல் எண் அல்லது ஆதார் மூலம் அரசு சேவைகளை அணுகவும்",
            phoneLabel: "மொபைல் எண்",
            sendOtp: "OTP அனுப்பு",
            verify: "OTP ஐ சரிபார்க்கவும்",
            resend: "எண்ணை மாற்று",
            enterOtp: "உங்கள் தொலைபேசிக்கு அனுப்பப்பட்ட குறியீட்டை உள்ளிடவும்"
        }
    };

    const t = text[lang] || text['en'];

    const handleSendOtp = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
        }, 1500);
    }

    const handleVerify = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            onLogin();
        }, 1500);
    }

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10 pointer-events-none"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-india-saffron/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-india-green/10 rounded-full blur-[100px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 z-10"
            >
                <div className="bg-india-navy p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 border border-white/20">
                            <Fingerprint className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">{t.secureLogin}</h2>
                        <p className="text-white/70 text-sm font-medium">{t.subtitle}</p>
                    </div>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSendOtp}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">{t.phoneLabel}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Phone className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+91 XXXXX XXXXX"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-india-navy focus:ring-2 focus:ring-india-navy/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || phone.length < 10}
                                    className="w-full py-4 bg-india-saffron hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>{t.sendOtp} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleVerify}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-500 font-medium mb-1">{t.enterOtp}</p>
                                    <p className="text-india-navy font-bold">{phone}</p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5, 6].map((digit) => (
                                        <input
                                            key={digit}
                                            type="text"
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-india-navy focus:ring-2 focus:ring-india-navy/20"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const next = e.target.nextElementSibling;
                                                    if (next) next.focus();
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-india-navy hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isLoading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <><Lock className="w-4 h-4" /> {t.verify}</>
                                        )}
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-india-saffron hover:text-orange-600 transition-colors uppercase tracking-widest mt-4">
                                        {t.resend}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
