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
          <main className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-5xl flex-col">
              <PageNav title="New York Burger" active="home" />

              <div className="flex flex-1 flex-col items-center justify-center py-10">
                <h1 className="mb-10 text-center text-5xl font-black italic tracking-tight md:text-7xl">
                  NEW YORK
                  <span className="mx-4 inline-block text-red-600 animate-spin">★</span>
                  BURGER
                </h1>

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
