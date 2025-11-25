import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'en' | 'sw' | 'kik';

interface TranslationContextType {
  t: (key: string, params?: Record<string, any>) => string;
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Clinical translations for Kenyan context
const translations: Record<SupportedLanguage, any> = {
  en: {
    // Navigation
    'home.title': 'MachoDoc X',
    'home.welcome': 'Welcome to MachoDoc X',
    'home.select_assessment': 'Select a health assessment',
    
    // Clinical terms
    'urgency.critical': 'Critical - Seek Immediate Care',
    'urgency.high': 'High Urgency',
    'urgency.medium': 'Medium Urgency', 
    'urgency.low': 'Low Urgency',
    
    // Buttons
    'button.start_assessment': 'Start Assessment',
    'button.emergency': 'Emergency',
    'button.continue': 'Continue',
    'button.back': 'Back',
    
    // Panels
    'panels.respiratory.title': 'Respiratory Check',
    'panels.respiratory.description': 'Cough, breathing, pneumonia screening',
    'panels.maternal.title': 'Maternal Health',
    'panels.maternal.description': 'Pregnancy, anemia, preeclampsia check',
    'panels.child.title': 'Child Health',
    'panels.child.description': 'WHO danger signs assessment',
    
    // Results
    'results.recommendations': 'Recommended Actions',
    'results.risk_factors': 'Risk Factors',
    'results.next_steps': 'Next Steps',
    'results.confidence': 'Confidence'
  },
  sw: {
    'home.title': 'MachoDoc X',
    'home.welcome': 'Karibu kwenye MachoDoc X',
    'home.select_assessment': 'Chagua ukaguzi wa afya',
    
    'urgency.critical': 'Muhimu Sana - Tafuta Huduma Haraka',
    'urgency.high': 'Haraka Sana',
    'urgency.medium': 'Haraka',
    'urgency.low': 'Si Haraka',
    
    'button.start_assessment': 'Anza Ukaguzi',
    'button.emergency': 'Dharura',
    'button.continue': 'Endelea',
    'button.back': 'Rudi',
    
    'panels.respiratory.title': 'Ukaguzi wa Upumuaji',
    'panels.respiratory.description': 'Kikohoa, upumuaji, ukaguzi wa nimonia',
    'panels.maternal.title': 'Afya ya Wajawazito',
    'panels.maternal.description': 'Ujauzito, upungufu wa damu, preeclampsia'
  },
  kik: {
    'home.title': 'MachoDoc X',
    'home.welcome': 'Ugueite MachoDoc X',
    
    'urgency.critical': 'Ngaari - Theeha Ũtungatiri wa Mbere',
    
    'button.start_assessment': 'Ambiriria Gũcagũria',
    'button.emergency': 'Mbere',
    'button.continue': 'Thiĩ Mbere'
  }
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('preferred_language') as SupportedLanguage;
      if (savedLang && translations[savedLang]) {
        setCurrentLanguage(savedLang);
        return;
      }

      // Auto-detect device language
      const deviceLang = Localization.locale.split('-')[0] as SupportedLanguage;
      if (translations[deviceLang]) {
        setCurrentLanguage(deviceLang);
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    }
  };

  const setLanguage = async (lang: SupportedLanguage) => {
    try {
      setCurrentLanguage(lang);
      await AsyncStorage.setItem('preferred_language', lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[currentLanguage]?.[key] || translations.en[key] || key;
    
    // Replace parameters in translation
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }
    
    return translation;
  };

  const value = {
    t,
    currentLanguage,
    setLanguage,
    isRTL: I18nManager.isRTL
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
