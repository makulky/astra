import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'

const saved = (() => {
  try {
    return localStorage.getItem('astra.lang')
  } catch {
    return null
  }
})()

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: saved ?? (navigator.language.startsWith('en') ? 'en' : 'es'),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem('astra.lang', lng)
  } catch {
    /* storage unavailable */
  }
})

export default i18n
