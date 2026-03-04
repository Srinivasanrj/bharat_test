import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import SchemeCard from '../components/SchemeCard';
import { translations } from '../utils/translations';
import { Filter, Search, MapPin, Grid, List as ListIcon } from 'lucide-react';

const SchemeResults = ({ globalLanguage }) => {
    const { state } = useLocation();
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    const language = globalLanguage || 'en';
    const t = translations[language] || translations['en'];

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await axios.post('http://localhost:5000/api/schemes/check-eligibility', {
                    userProfile: state?.userProfile || {}
                });
                setSchemes(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [state]);

    const categories = ['All', 'Agriculture', 'Education', 'Health', 'Business'];

    const filteredSchemes = filter === 'All'
        ? schemes
        : schemes.filter(s => s.category === filter);

    // Sorting: Eligible first
    const sortedSchemes = [...filteredSchemes].sort((a, b) => {
        if (a.eligibilityStatus === 'eligible' && b.eligibilityStatus !== 'eligible') return -1;
        if (a.eligibilityStatus !== 'eligible' && b.eligibilityStatus === 'eligible') return 1;
        return 0;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-india-navy">
                        {t.results_title}
                    </h2>
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <MapPin className="w-4 h-4 text-india-green" />
                        <span>Showing results for {state?.userProfile?.state || "India"}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === cat ? 'bg-india-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-3xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedSchemes.map(scheme => (
                        <SchemeCard key={scheme.id} scheme={scheme} language={language} />
                    ))}
                </div>
            )}

            {!loading && sortedSchemes.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <div className="bg-gray-50 inline-block p-6 rounded-full">
                        <Search className="w-12 h-12 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No projects found for the selected filter.</p>
                </div>
            )}
        </div>
    );
};

export default SchemeResults;
