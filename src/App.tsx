import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
