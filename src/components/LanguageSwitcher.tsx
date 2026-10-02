import { useTranslation } from 'react-i18next'

const LANGS = ['es', 'en'] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l} className={current === l ? 'active' : ''} aria-pressed={current === l} onClick={() => i18n.changeLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
