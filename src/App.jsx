import { useEffect, useState } from 'react'

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
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-5 py-10">
      <h1 className="mb-10 text-center text-5xl md:text-7xl font-black italic tracking-tight">
        NEW YORK
        <span className="mx-4 inline-block text-red-600 animate-spin">★</span>
        BURGER
      </h1>

      <img
        src={`${import.meta.env.BASE_URL}assets/IMG_4107.jpeg`}
        alt="New York Burger storefront"
        className="w-full max-w-[340px] sm:max-w-[420px] rounded-2xl shadow-2xl"
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
    </main>
  )
}