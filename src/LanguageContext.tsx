import React, { createContext, useContext, useState, useEffect } from "react";
import { enStrings, amStrings, StringTree } from "./strings";

type Language = "en" | "am";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  strings: StringTree;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const storedLang = localStorage.getItem("app_lang") as Language;
    if (storedLang === "en" || storedLang === "am") {
      setLanguage(storedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_lang", lang);
  };

  const strings = language === "en" ? enStrings : amStrings;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, strings }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
