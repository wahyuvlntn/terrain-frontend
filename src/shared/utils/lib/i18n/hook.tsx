import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { stringBuilder } from './util';

// Define the shape of the context
// interface LanguageContextProps {
//   switchLanguage: (lang: string) => void;
//   currentLanguage: string;
// }

//TODO: remove this since it's not used anywhere
// Create the context
// const LanguageContext = createContext<LanguageContextProps | undefined>(
//   undefined
// );

// Define the type for the returned object
type UseLanguageSwitcher = {
  switchLanguage: (lang: string) => void;
  currentLanguage: string;
};

// Create the custom hook
export const useLanguageSwitcher = (): UseLanguageSwitcher => {
  const { i18n } = useTranslation();

  const switchLanguage = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang).then(() => {
        localStorage.setItem('current_language', lang);
      });
      // window.location.reload();
    },
    [i18n]
  );

  return {
    switchLanguage,
    currentLanguage: i18n.language,
  };
};

//TODO: remove this since it's not used anywhere
// Create the provider component
// export const LanguageProvider = ({ children }: { children: ReactNode }) => {
//   const languageSwitcher = useLanguageSwitcher();
//   return (
//     <LanguageContext.Provider value={languageSwitcher}>
//       {children}
//     </LanguageContext.Provider>
//   );
// };

//TODO: remove this since it's not used anywhere
// Custom hook to use the language context
// export const useLanguageContext = (): LanguageContextProps => {
//   const context = useContext(LanguageContext);
//   if (!context) {
//     throw new Error(
//       'useLanguageContext must be used within a LanguageProvider'
//     );
//   }
//   return context;
// };

export const useTranslate = () => {
  const { t: translate } = useTranslation();
  const t = useCallback(
    (key: string, ...params: string[]) => {
      return stringBuilder(translate(key), ...params);
    },
    [translate]
  );

  return { t };
};
