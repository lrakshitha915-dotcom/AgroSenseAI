import { Language, TRANSLATIONS, TranslationKey } from '@/constants/translations';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const STORAGE_LANG_KEY = '@agrosense_language';
const STORAGE_CHOSEN_KEY = '@agrosense_language_chosen';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  hasChosenLanguage: boolean;
  confirmLanguage: (lang: Language) => Promise<void>;
  showLanguageModal: boolean;
  setShowLanguageModal: (show: boolean) => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  hasChosenLanguage: true,
  confirmLanguage: async () => {},
  showLanguageModal: false,
  setShowLanguageModal: () => {},
  t: (key: TranslationKey, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean>(true);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function loadSavedLanguage() {
      if (AsyncStorage) {
        try {
          const [savedLang, savedChosen] = await Promise.all([
            AsyncStorage.getItem(STORAGE_LANG_KEY),
            AsyncStorage.getItem(STORAGE_CHOSEN_KEY),
          ]);

          if (savedLang === 'en' || savedLang === 'kn') {
            setLanguageState(savedLang);
          }

          if (savedChosen === 'true') {
            setHasChosenLanguage(true);
            setShowLanguageModal(false);
          } else {
            // First time opening app: ask on home screen
            setHasChosenLanguage(false);
            setShowLanguageModal(true);
          }
        } catch (e) {
          console.log('Error reading language from storage:', e);
        }
      }
      setIsLoaded(true);
    }

    loadSavedLanguage();
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(STORAGE_LANG_KEY, newLang);
      } catch (e) {
        console.log('Error saving language:', e);
      }
    }
  };

  const confirmLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    setHasChosenLanguage(true);
    setShowLanguageModal(false);
    if (AsyncStorage) {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_LANG_KEY, newLang],
          [STORAGE_CHOSEN_KEY, 'true'],
        ]);
      } catch (e) {
        console.log('Error confirming language:', e);
      }
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    const value = dict[key];
    if (value) return value;
    const enValue = TRANSLATIONS.en[key];
    if (enValue) return enValue;
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        hasChosenLanguage,
        confirmLanguage,
        showLanguageModal,
        setShowLanguageModal,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
