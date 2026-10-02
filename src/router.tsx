import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'

const PlanetLab = lazy(() => import('./pages/PlanetLab'))

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      {
        path: '/planet-lab',
        element: (
          <Suspense fallback={<div className="loading">…</div>}>
            <PlanetLab />
          </Suspense>
        ),
      },
    ],
  },
])
