import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, Globe } from 'lucide-react';

const Header = ({ lang, setLang }) => {
    return (
        <header className="w-full bg-white shadow-sm border-b-4 border-india-navy sticky top-0 z-50">
            <div className="bg-india-saffron h-1 w-full"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                        alt="Emblem of India"
                        className="h-8 w-auto"
                    />
                    <div className="border-l border-gray-200 pl-3">
                        <h1 className="text-sm font-black text-india-navy tracking-tighter leading-none">
                            भारत सरकार
                        </h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                            Govt of India
                        </p>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <nav className="flex items-center gap-6">
                        <Link to="/" className="text-xs font-bold text-india-navy uppercase tracking-widest hover:text-india-saffron transition-colors">
                            {lang === 'hi' ? 'मुख्य पृष्ठ' : lang === 'ta' ? 'முகப்பு' : lang === 'te' ? 'హోమ్' : lang === 'kn' ? 'ಮುಖಪುಟ' : lang === 'ml' ? 'ഹോം' : lang === 'bn' ? 'হোম' : lang === 'mr' ? 'मुख्यपृष्ठ' : lang === 'gu' ? 'મુખ્યપૃષ્ઠ' : lang === 'pa' ? 'ਮੁੱਖ ਪੰਨਾ' : lang === 'or' ? 'ମୂଳପୃଷ୍ଠା' : lang === 'as' ? 'মূলপৃষ্ঠা' : lang === 'ur' ? 'ہوم' : lang === 'bho' ? 'मुखपन्ना' : lang === 'sa' ? 'मुख्यपृष्ठम्' : 'Home'}
                        </Link>
                        <Link to="/all-schemes" className="text-xs font-bold text-india-navy flex items-center gap-1 uppercase tracking-widest hover:text-india-saffron transition-colors">
                            <Search className="w-3 h-3" /> All Schemes
                        </Link>
                        <a href="https://www.digitalindia.gov.in/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-india-navy uppercase tracking-widest hover:text-india-saffron transition-colors">Digital India</a>
                        <button className="text-xs font-bold text-india-navy uppercase tracking-widest hover:text-india-saffron transition-colors">MyScheme</button>
                        <a href="https://web.umang.gov.in/web_new/login?redirect_to=web" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-india-navy uppercase tracking-widest hover:text-india-saffron transition-colors">UMANG</a>
                        <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold bg-india-saffron text-white px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-1">
                            Book Appointment
                        </a>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {lang ? (
                        <div className="flex items-center gap-1 border border-gray-200 rounded-full px-3 py-1.5 hover:border-india-navy transition-colors bg-white">
                            <Globe className="w-4 h-4 text-india-navy" />
                            <select
                                value={lang}
                                onChange={(e) => setLang(e.target.value)}
                                className="text-xs outline-none text-india-navy font-bold bg-transparent cursor-pointer"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिंदी</option>
                                <option value="ta">தமிழ்</option>
                                <option value="te">తెలుగు</option>
                                <option value="kn">ಕನ್ನಡ</option>
                                <option value="ml">മലയാളം</option>
                                <option value="bn">বাংলা</option>
                                <option value="mr">मराठी</option>
                                <option value="gu">ગુજરાતી</option>
                                <option value="pa">ਪੰਜਾਬੀ</option>
                                <option value="or">ଓଡ଼ିଆ</option>
                                <option value="as">অসমীয়া</option>
                                <option value="ur">اردو</option>
                                <option value="bho">भोजपुरी</option>
                                <option value="sa">संस्कृतम्</option>
                                <option value="mai">मैथिली</option>
                                <option value="kok">कोंकणी</option>
                                <option value="doi">डोगरी</option>
                                <option value="sd">سنڌي</option>
                                <option value="ks">کٲشُر</option>
                                <option value="ne">नेपाली</option>
                            </select>
                        </div>
                    ) : (
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Globe className="w-5 h-5 text-india-navy" />
                        </button>
                    )}
                    <button className="md:hidden p-2 hover:bg-gray-100 rounded-full">
                        <Menu className="w-6 h-6 text-india-navy" />
                    </button>
                </div>
            </div>
            <div className="bg-india-green h-1 w-full"></div>
        </header>
    );
};

export default Header;
