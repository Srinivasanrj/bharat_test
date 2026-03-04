import React from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../utils/translations';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

const SchemeCard = ({ scheme, language = 'en' }) => {
    const navigate = useNavigate();
    const t = translations[language] || translations['en'];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'eligible':
                return <span className="bg-green-100 text-india-green px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.eligible}</span>;
            case 'docs_needed':
                return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t.docs_needed}</span>;
            case 'not_eligible':
                return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> {t.not_eligible}</span>;
            default:
                return null;
        }
    };

    const getCategoryColor = (cat) => {
        const categories = {
            'Agriculture': 'border-india-green text-india-green',
            'Education': 'border-blue-600 text-blue-600',
            'Health': 'border-red-600 text-red-600',
            'Business': 'border-india-saffron text-india-saffron'
        };
        return categories[cat] || 'border-india-navy text-india-navy';
    };

    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-gray-100 group">
            <div className={`h-2 w-full ${scheme.category === 'Agriculture' ? 'bg-india-green' : scheme.category === 'Business' ? 'bg-india-saffron' : 'bg-india-navy'}`}></div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className={`px-2 py-1 border rounded-md text-[10px] font-bold uppercase ${getCategoryColor(scheme.category)}`}>
                        {t[`cat_${scheme.category.replace(' ', '_')}`] || scheme.category}
                    </div>
                    {getStatusBadge(scheme.eligibilityStatus)}
                </div>

                <div>
                    <h3 className="text-xl font-extrabold text-india-navy group-hover:text-india-saffron transition-colors">
                        {t[`scheme_${scheme.id}_name`] || scheme.name}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{t[`scheme_${scheme.id}_desc`] || scheme.description}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.benefit_amount}</p>
                        <p className="text-2xl font-black text-india-navy">{scheme.benefit}</p>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" className="h-6 opacity-40" />
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.days_15_20}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.government_approved}</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/apply', { state: { scheme, language } })}
                        className="flex-1 btn-saffron !py-2.5 text-sm"
                    >
                        {t.apply_now}
                    </button>
                    <button className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <ExternalLink className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchemeCard;
