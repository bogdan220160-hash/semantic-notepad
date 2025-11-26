import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('language');
        return (saved && translations[saved]) ? saved : 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key) => {
        if (!translations[language]) {
            console.warn(`Language '${language}' not found in translations.`);
            return key;
        }
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        console.error("useLanguage must be used within a LanguageProvider");
        return {
            language: 'en',
            setLanguage: () => { },
            t: (key) => key
        };
    }
    return context;
};
