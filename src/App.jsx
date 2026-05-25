import { useEffect, useState } from 'react'
import { Routes, Route } from "react-router-dom"
import Movies from "./pages/Movies"
import Videos from "./pages/Videos"
import Lobby from "./pages/Lobby"
import PageNav from "./components/PageNav"

export default function App() {
  const targetDate = new Date('2026-09-03T00:00:00')

  const getTimeLeft = () => {
    const difference = targetDate - new Date()

    return {
      days: Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((difference / (1000 * 60 * 60)) % 24)),
      minutes: Math.max(0, Math.floor((difference / (1000 * 60)) % 60)),
      seconds: Math.max(0, Math.floor((difference / 1000) % 60)),
    }
  }

  const [timeLeft, setTimeLeft] = useState(getTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="min-h-screen overflow-x-hidden bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-5xl flex-col">
              <PageNav active="home" />

              <div className="flex flex-1 flex-col items-center justify-center py-10">
                <div className="mb-10 w-full overflow-hidden">
                  <h1 className="hero-title text-center font-black italic tracking-tight text-white sm:text-6xl md:text-7xl">
                    NEW YORK
                    <span className="mx-2 inline-block text-red-600 sm:mx-3">★</span>
                    BURGER
                  </h1>
                </div>

                <style>{`
                  .hero-title {
                    font-size: clamp(2.15rem, 11vw, 4.5rem);
                    line-height: 0.95;
                    white-space: nowrap;
                  }

                  @media (max-width: 430px) {
                    .hero-title {
                      display: inline-block;
                      min-width: max-content;
                      animation: heroSlide 4.5s linear infinite;
                    }
                  }

                  @keyframes heroSlide {
                    0%, 10% {
                      transform: translateX(0);
                    }

                    90%, 100% {
                      transform: translateX(calc(-100% + 100vw - 1.5rem));
                    }
                  }
                `}</style>

                <img
                  src={`${import.meta.env.BASE_URL}assets/IMG_4107.jpeg`}
                  alt="New York Burger storefront"
                  className="w-full max-w-[340px] rounded-2xl shadow-2xl sm:max-w-[420px]"
                />

                <div className="mt-8 text-center">
                  <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-400">
                    verrückte mausige event
                  </p>

                  <div className="flex justify-center gap-4 text-2xl font-bold">
                    <span>{timeLeft.days}d</span>
                    <span>{timeLeft.hours}h</span>
                    <span>{timeLeft.minutes}m</span>
                    <span>{timeLeft.seconds}s</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        }
      />

      <Route path="/movies" element={<Movies />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/lobby/:id" element={<Lobby />} />
    </Routes>
  )
}
