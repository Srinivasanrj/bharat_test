import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, ShieldCheck, Zap, BookOpen, Landmark, Info, Sparkles, Users, Mic, Smartphone, MessageSquare, CheckCircle2 } from 'lucide-react';
import { translations, languageMap } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import SchemeCard from '../components/SchemeCard';
import Login from './Login';

const Home = ({ lang, setLang, isAuthenticated, setIsAuthenticated }) => {
    const navigate = useNavigate();

    const t = translations[lang] || translations['en'];
    const [schemes, setSchemes] = useState([]);

    useEffect(() => {
        if (lang) {
            const fetchSchemes = async () => {
                try {
                    const response = await axios.get('http://localhost:5000/api/schemes');
                    setSchemes(response.data);
                } catch (error) {
                    console.error("Error fetching schemes:", error);
                }
            };
            fetchSchemes();
        }
    }, [lang]);

    const handleOpenAssistant = () => {
        window.dispatchEvent(new Event('open-chat'));
    };

    if (!lang) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card max-w-2xl w-full p-8 md:p-12 rounded-[2rem] text-center space-y-10 border-2 border-india-navy/5"
                >
                    <div className="flex justify-center mb-4">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" className="h-16" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-india-navy">Welcome to Mitra</h2>
                        <p className="text-gray-500 font-medium">Please select your preferred language to continue</p>
                        <div className="flex justify-center gap-2">
                            <div className="h-1 w-8 bg-india-saffron rounded-full"></div>
                            <div className="h-1 w-8 bg-india-white border border-gray-200 rounded-full"></div>
                            <div className="h-1 w-8 bg-india-green rounded-full"></div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {[
                            { id: 'en', label: 'English', sub: 'Scholarships & Business' },
                            { id: 'hi', label: 'हिंदी', sub: 'कृषि और स्वास्थ्य' },
                            { id: 'ta', label: 'தமிழ்', sub: 'கல்வி மற்றும் சேவை' },
                            { id: 'te', label: 'తెలుగు', sub: 'సంక్షేమం' },
                            { id: 'kn', label: 'ಕನ್ನಡ', sub: 'ಶಿಕ್ಷಣ' },
                            { id: 'ml', label: 'മലയാളം', sub: 'ആരോഗ്യം' },
                            { id: 'bn', label: 'বাংলা', sub: 'ব্যবসা' },
                            { id: 'mr', label: 'मराठी', sub: 'शेती आणि व्यवसाय' },
                            { id: 'gu', label: 'ગુજરાતી', sub: 'વેપાર' },
                            { id: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'ਖੇਤੀਬਾੜੀ' },
                            { id: 'or', label: 'ଓଡ଼ିଆ', sub: 'ଶିକ୍ଷା ଏବଂ ସେବା' },
                            { id: 'as', label: 'অসমীয়া', sub: 'কৃষি' },
                            { id: 'ur', label: 'اردو', sub: 'تعلیم' },
                            { id: 'bho', label: 'भोजपुरी', sub: 'खेती और बिजनेस' },
                            { id: 'sa', label: 'संस्कृतम्', sub: 'कृषिः शिक्षा च' },
                            { id: 'mai', label: 'मैथिली', sub: 'कृषि आ व्यापार' },
                            { id: 'kok', label: 'कोंकणी', sub: 'शेती आनी वेपार' },
                            { id: 'doi', label: 'डोगरी', sub: 'कृषि ते व्यापार' },
                            { id: 'sd', label: 'سنڌي', sub: 'زراعت ۽ ڪاروبار' },
                            { id: 'ks', label: 'کٲشُر', sub: 'کِرسٲنی تہٕ کارُوبار' },
                            { id: 'ne', label: 'नेपाली', sub: 'कृषि र व्यापार' }
                        ].map((l) => (
                            <button
                                key={l.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setLang(l.id);
                                }}
                                className="p-4 w-40 bg-white border-2 border-gray-100 rounded-3xl hover:border-india-navy transition-all group flex flex-col items-center gap-2 shadow-sm transform hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                <span className="text-xl font-black text-india-navy group-hover:text-india-saffron">{l.label}</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{l.sub}</span>
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">
                        Digital India Initiative • Ministry of Electronics & IT
                    </p>
                </motion.div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login lang={lang} onLogin={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen relative">
            <div className="absolute inset-0 dot-pattern pointer-events-none"></div>
            {/* Hero Section */}
            <section className="relative bg-white pt-16 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 space-y-8 z-10 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-india-saffron/10 border border-india-saffron/20 text-india-saffron text-xs font-bold uppercase tracking-widest">
                            <Zap className="w-3 h-3" /> {t.ai_gov}
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-india-navy leading-[1.1] tracking-tighter">
                            {t.welcome}
                        </h2>
                        <p className="text-xl text-gray-600 font-medium max-w-xl">
                            {t.hero_desc || 'Our AI assistant helps you find and apply for the right government schemes in your mother tongue. No more paperwork, just progress.'}
                        </p>
                        <div className="flex flex-col md:flex-row gap-6 justify-center lg:justify-start items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-100 mt-8">
                            <div className="flex flex-col gap-4 w-full md:w-auto">
                                <button className="btn-saffron flex items-center justify-center gap-2 group w-full px-8 py-4 text-lg" onClick={handleOpenAssistant}>
                                    {t.open_ai || 'Open AI Assistant'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button onClick={() => setLang(null)} className="px-8 py-4 bg-white text-india-navy font-bold rounded-full border border-india-navy/10 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm w-full transition-colors cursor-pointer">
                                    <Globe className="w-5 h-5" /> {t.change_lang || 'Change Language'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute inset-0 bg-india-navy/5 rounded-full blur-[100px] -z-10 animate-pulse"></div>
                        <img
                            src="/hero_illustration.png"
                            alt="Indian Government AI"
                            className="w-full max-w-lg mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-india-green/10 text-india-green text-xs font-bold uppercase tracking-widest border border-india-green/20">
                            <Sparkles className="w-3 h-3" /> {t.next_gen}
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black text-india-navy tracking-tighter">{t.everything_need}</h3>
                        <p className="text-gray-500 font-medium text-lg">{t.eliminated_complexities}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: Mic, title: t.voice_chat, color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-100', desc: t.voice_chat_desc },
                            { icon: Globe, title: t.langs_9, color: 'bg-orange-100 text-orange-700', border: 'border-orange-100', desc: t.langs_9_desc },
                            { icon: MessageSquare, title: t.pers_match, color: 'bg-green-100 text-green-700', border: 'border-green-100', desc: t.pers_match_desc }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -5 }}
                                className={`bg-white p-8 rounded-[2rem] shadow-sm border ${feature.border} space-y-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-gray-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center`}>
                                    <feature.icon className="w-7 h-7" />
                                </div>
                                <h4 className="text-2xl font-black text-india-navy">{feature.title}</h4>
                                <p className="text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="bg-india-navy py-24 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10 pointer-events-none"></div>
                <div className="absolute -top-[50%] -right-[10%] w-[800px] h-[800px] bg-india-saffron/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
                    <div className="text-center space-y-4">
                        <h3 className="text-4xl md:text-5xl font-black tracking-tighter">{t.how_it_works}</h3>
                        <p className="text-india-white/70 font-medium max-w-2xl mx-auto text-lg">{t.how_desc}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-india-saffron via-white to-india-green opacity-20"></div>

                        {[
                            { step: '01', title: t.step1_title, desc: t.step1_desc },
                            { step: '02', title: t.step2_title, desc: t.step2_desc },
                            { step: '03', title: t.step3_title, desc: t.step3_desc },
                            { step: '04', title: t.step4_title, desc: t.step4_desc },
                        ].map((item, i) => (
                            <div key={i} className="relative flex flex-col items-center text-center space-y-6">
                                <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shrink-0 z-10 shadow-2xl relative">
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-india-saffron to-orange-400">{item.step}</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                                    <p className="text-white/60 text-sm font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Impact Section */}
            <section className="bg-gray-50 py-24 border-y border-gray-100 relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-black text-india-navy uppercase tracking-tighter">{t.gov_init}</h3>
                        <p className="text-gray-500 font-medium max-w-2xl mx-auto">{t.gov_init_desc}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Landmark, title: 'PM-KISAN', color: 'bg-green-100 text-green-700', desc: t.pm_kisan_desc },
                            { icon: ShieldCheck, title: 'Ayushman Bharat', color: 'bg-red-100 text-red-700', desc: t.ayushman_desc },
                            { icon: BookOpen, title: 'NSP', color: 'bg-blue-100 text-blue-700', desc: t.nsp_desc },
                            { icon: Zap, title: 'DigiLocker', color: 'bg-amber-100 text-amber-700', desc: t.digilocker_desc }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 hover:shadow-lg transition-all">
                                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h4 className="font-black text-india-navy">{item.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* All Schemes Section */}
            <section className="bg-white py-24 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-black text-india-navy uppercase tracking-tighter">{t.avail_schemes}</h3>
                        <p className="text-gray-500 font-medium max-w-2xl mx-auto">{t.avail_schemes_desc}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {schemes.slice(0, 6).map(scheme => (
                            <SchemeCard key={scheme.id} scheme={scheme} language={lang} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer Info / CTA */}
            <section className="bg-gray-50 py-24">
                <div className="max-w-5xl mx-auto px-4 text-center space-y-8">
                    <div className="bg-gradient-to-br from-gov-indigo/10 to-transparent p-12 rounded-[3.5rem] border border-gov-indigo/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-gov-indigo"></div>
                        <Info className="w-12 h-12 text-gov-indigo mx-auto mb-6" />
                        <h3 className="text-3xl md:text-4xl font-black text-india-navy mb-6 tracking-tighter">{t.empowering}</h3>
                        <p className="text-gray-600 leading-relaxed text-lg max-w-3xl mx-auto">
                            {t.empowering_desc}
                        </p>
                        <div className="mt-10 flex justify-center gap-4 flex-wrap">
                            <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 flex items-center gap-2 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t.free_100}
                            </div>
                            <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 flex items-center gap-2 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t.official_data}
                            </div>
                            <div className="bg-white px-4 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 flex items-center gap-2 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t.secure}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
