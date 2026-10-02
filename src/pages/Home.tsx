import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function Home() {
  const { t } = useTranslation()
  return (
    <div className="home">
      <div className="home-bg" aria-hidden />
      <section className="hero">
        <p className="kicker">{t('home.kicker')}</p>
        <h1>{t('home.title')}</h1>
        <p className="subtitle">{t('home.subtitle')}</p>
      </section>
      <section className="cards">
        <Link to="/planet-lab" className="card card-main">
          <div className="card-orb" aria-hidden />
          <h2>{t('home.cards.planetLab.title')}</h2>
          <p>{t('home.cards.planetLab.desc')}</p>
          <span className="cta">{t('home.cards.planetLab.cta')} →</span>
        </Link>
        {(['stars', 'orbits'] as const).map((k) => (
          <div key={k} className="card card-soon" aria-disabled>
            <span className="badge">{t('home.cards.soon')}</span>
            <h2>{t(`home.cards.${k}.title`)}</h2>
            <p>{t(`home.cards.${k}.desc`)}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
