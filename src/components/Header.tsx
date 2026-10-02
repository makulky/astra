import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Header() {
  const { t } = useTranslation()
  return (
    <header className="header">
      <NavLink to="/" className="brand">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
          <circle cx="16" cy="16" r="8" fill="url(#g)" />
          <ellipse cx="16" cy="16" rx="14.5" ry="4.2" fill="none" stroke="#ffd27a" strokeWidth="1.6" transform="rotate(-20 16 16)" />
          <defs>
            <radialGradient id="g" cx="0.35" cy="0.35">
              <stop offset="0" stopColor="#9fd0ff" />
              <stop offset="1" stopColor="#2f6bff" />
            </radialGradient>
          </defs>
        </svg>
        <span>Astra</span>
      </NavLink>
      <nav className="nav">
        <NavLink to="/" end>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/planet-lab">{t('nav.planetLab')}</NavLink>
        <NavLink to="/black-hole-lab">{t('nav.blackHoleLab')}</NavLink>
      </nav>
      <LanguageSwitcher />
    </header>
  )
}
