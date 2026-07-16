import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '../org-prj';
import commonCn from './locales/cn/common.json';
import commonEn from './locales/en/common.json';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        common: commonEn,
      },
    },
    cn: {
      translation: {
        common: commonCn,
      },
    },
  },
  lng: DEFAULT_LANGUAGE(), // Set default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
