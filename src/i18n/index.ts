import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import francais from './locales/fr.json';
import malgache from './locales/mg.json';

const langueAppareil = getLocales()[0]?.languageCode;
const langueInitiale = langueAppareil === 'mg' ? 'mg' : 'fr';

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: francais },
    mg: { translation: malgache },
  },
  lng: langueInitiale,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
