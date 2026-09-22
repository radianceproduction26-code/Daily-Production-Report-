// Radiance Polymers - I18n Context & Custom Hook
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, LOCALIZED_REJECTION_CODES, LOCALIZED_DOWNTIME_CODES } from './translations';

const I18nContext = createContext(null);
const STORAGE_KEY = 'radiance_preferred_lang_v1';

export function I18nProvider({ children, currentUser, onUpdateUserProfileLanguage }) {
  // Determine initial language: profile preference > localStorage > 'en'
  const [language, setLanguageState] = useState(() => {
    return currentUser?.preferredLanguage || localStorage.getItem(STORAGE_KEY) || 'en';
  });

  // Sync with user profile if user changes
  useEffect(() => {
    if (currentUser?.preferredLanguage && currentUser.preferredLanguage !== language) {
      setLanguageState(currentUser.preferredLanguage);
    }
  }, [currentUser?.id]);

  const setLanguage = (newLang) => {
    if (newLang !== 'en' && newLang !== 'hi') return;
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    if (onUpdateUserProfileLanguage) {
      onUpdateUserProfileLanguage(newLang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  /**
   * Translates a given key, substituting optional template parameters {name}
   */
  const t = (key, params = {}) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || key;

    // Substitute parameters like {num}, {prod}, {max}
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    });

    return text;
  };

  /**
   * Helper to fetch localized rejection code description
   */
  const getRejectionDescription = (code) => {
    const found = LOCALIZED_REJECTION_CODES.find(r => r.code === code);
    if (!found) return code;
    return language === 'hi' ? found.desc_hi : found.desc_en;
  };

  /**
   * Helper to fetch localized downtime code description
   */
  const getDowntimeDescription = (code) => {
    const found = LOCALIZED_DOWNTIME_CODES.find(d => d.code === code);
    if (!found) return code;
    return language === 'hi' ? found.desc_hi : found.desc_en;
  };

  /**
   * Helper to fetch localized downtime category
   */
  const getDowntimeCategory = (category) => {
    if (language !== 'hi') return category;
    const catMap = {
      'Machine Related': 'मशीन संबंधित',
      'Mould Related': 'मोल्ड संबंधित',
      'Material Related': 'सामग्री संबंधित',
      'Process Related': 'प्रक्रिया संबंधित',
      'Utility Related': 'उपयोगिता संबंधित',
      'Manpower Related': 'मानव शक्ति संबंधित',
      'Others': 'अन्य'
    };
    return catMap[category] || category;
  };

  const value = {
    language,
    isHindi: language === 'hi',
    setLanguage,
    toggleLanguage,
    t,
    getRejectionDescription,
    getDowntimeDescription,
    getDowntimeCategory
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
