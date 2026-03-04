import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Conversation from './pages/Conversation';
import SchemeResults from './pages/SchemeResults';
import ApplicationForm from './pages/ApplicationForm';
import AllSchemesList from './pages/AllSchemesList';
import FloatingChat from './components/FloatingChat';

function App() {
  const [globalLanguage, setGlobalLanguage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col font-inter">
        <Header lang={globalLanguage} setLang={setGlobalLanguage} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home lang={globalLanguage} setLang={setGlobalLanguage} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/chat" element={<Conversation globalLanguage={globalLanguage} setGlobalLanguage={setGlobalLanguage} />} />
            <Route path="/results" element={<SchemeResults globalLanguage={globalLanguage} />} />
            <Route path="/apply" element={<ApplicationForm globalLanguage={globalLanguage} />} />
            <Route path="/all-schemes" element={<AllSchemesList globalLanguage={globalLanguage} />} />
          </Routes>
        </main>

        {/* Global Floating AI Assistant - Bottom Right */}
        <FloatingChat language={globalLanguage} />

        <footer className="bg-white border-t border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 grayscale opacity-60">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" className="h-8" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-india-navy">Government of India</p>
                <p className="text-[8px] font-bold text-gray-400">Digital India Initiative</p>
              </div>
            </div>

            <div className="flex gap-8">
              <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-india-navy">Privacy Policy</button>
              <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-india-navy">Terms of Service</button>
              <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-india-navy">Contact Us</button>
            </div>

            <div className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">
              © 2026 MEITY • Designed for Bharat
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
