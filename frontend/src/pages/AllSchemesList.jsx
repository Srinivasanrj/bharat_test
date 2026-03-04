import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowLeft, ArrowRight, X, FileText, CheckCircle, Info } from 'lucide-react';
import axios from 'axios';
import { translations } from '../utils/translations';

const AllSchemesList = ({ globalLanguage }) => {
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const navigate = useNavigate();

    const language = globalLanguage || 'en';
    const t = translations[language] || translations['en'];

    const fetchSchemes = async (currentPage = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/schemes/all-csv`, {
                params: {
                    page: currentPage,
                    limit: 12,
                    search: searchTerm,
                    location: locationFilter,
                    lang: language
                }
            });
            setSchemes(response.data.schemes);
            setTotalPages(response.data.pages);
            setPage(response.data.page);
        } catch (error) {
            console.error('Error fetching schemes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchSchemes(1);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, locationFilter, language]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchSchemes(newPage);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-india-navy">
                        {t.avail_schemes || 'All Government Schemes'}
                    </h2>
                    <p className="text-gray-500 mt-2">{t.avail_schemes_desc || 'Browse schemes extracted from our database'}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t.search_placeholder || "Search by scheme name or keywords..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-india-navy outline-none font-medium"
                    />
                </div>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Filter by state or location..."
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-india-navy outline-none font-medium"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-64 bg-white animate-pulse rounded-3xl border border-gray-100"></div>
                    ))}
                </div>
            ) : schemes.length === 0 ? (
                <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-gray-100">
                    <div className="bg-gray-50 inline-block p-6 rounded-full">
                        <Search className="w-12 h-12 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium text-lg">No schemes found matching your criteria.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schemes.map((scheme, idx) => (
                            <div
                                key={idx}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all flex flex-col group cursor-pointer hover:-translate-y-1"
                                onClick={() => setSelectedScheme(scheme)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        {scheme.category || 'General'}
                                    </div>
                                    {scheme.level && (
                                        <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                            <MapPin className="w-3 h-3" />
                                            {scheme.level.substring(0, 15)}{scheme.level.length > 15 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-india-navy group-hover:text-india-saffron transition-colors line-clamp-2 mb-2" title={scheme.name}>
                                    {scheme.name || 'Unnamed Scheme'}
                                </h3>
                                <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-1" title={scheme.description}>
                                    {scheme.description || 'No description available for this scheme.'}
                                </p>
                                <div className="border-t border-gray-50 pt-4 mt-auto">
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-gray-400 uppercase text-[10px] tracking-wider">{t.benefit_amount || 'Benefits'}</span>
                                        <span className="text-india-green line-clamp-1 max-w-[150px] text-right" title={scheme.benefit}>{scheme.benefit || t.details || 'View Details'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 bg-white py-4 px-6 rounded-2xl shadow-sm border border-gray-100 w-max mx-auto">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-india-navy transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="font-bold text-sm text-india-navy">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-india-navy transition-colors cursor-pointer"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Scheme Details Modal */}
            {selectedScheme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in-up">
                        {/* Header */}
                        <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        {selectedScheme.category || 'General'}
                                    </span>
                                    {selectedScheme.level && (
                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                            <MapPin className="w-3 h-3" />
                                            {selectedScheme.level}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-india-navy">{selectedScheme.name}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedScheme(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors self-start"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-8">
                            {/* Tags / Benefit Quick Look */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 font-bold text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Benefits: {selectedScheme.benefit || 'Variable'}
                                </div>
                                {selectedScheme.tags && selectedScheme.tags.split(',').map((tag, idx) => (
                                    <div key={idx} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
                                        {tag.trim()}
                                    </div>
                                ))}
                            </div>

                            <section>
                                <h3 className="text-lg font-bold text-india-navy flex items-center gap-2 mb-3">
                                    <Info className="w-5 h-5 text-india-saffron" />
                                    Scheme Details
                                </h3>
                                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                    {selectedScheme.description || 'No detailed description available.'}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-india-navy flex items-center gap-2 mb-3">
                                    <CheckCircle className="w-5 h-5 text-india-green" />
                                    Eligibility Criteria
                                </h3>
                                <div className="bg-green-50 p-5 rounded-2xl border border-green-100 text-sm md:text-base">
                                    <p className="text-green-900 leading-relaxed whitespace-pre-wrap">
                                        {selectedScheme.eligibility_text || 'Eligibility criteria not specified.'}
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-india-navy flex items-center gap-2 mb-3">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    Application Process & Documents
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-sm md:text-base">
                                        <h4 className="font-bold text-blue-900 mb-2 uppercase text-xs tracking-wider">How to Apply</h4>
                                        <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                                            {selectedScheme.application || 'Application process details not available.'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-sm md:text-base">
                                        <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2 uppercase text-xs tracking-wider">Required Documents</h4>
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mt-2">
                                            {selectedScheme.documents || 'Document requirements not specified.'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button
                                onClick={() => setSelectedScheme(null)}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-800 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                {t.close || 'Close'}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedScheme(null);
                                    navigate('/apply');
                                }}
                                className="px-8 py-3 bg-india-navy text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {t.apply_now || 'Apply Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllSchemesList;
