import { useEffect, useMemo, useState } from "react"
import PageNav from "../components/PageNav"
import { getLeaderboard } from "../lib/supabaseClient"

function Medal({ rank }) {
  if (rank === 1) return <span aria-label="First place">🥇</span>
  if (rank === 2) return <span aria-label="Second place">🥈</span>
  if (rank === 3) return <span aria-label="Third place">🥉</span>
  return <span className="text-neutral-500">#{rank}</span>
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
    </div>
  )
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const topThree = useMemo(() => leaders.slice(0, 3), [leaders])
  const rest = useMemo(() => leaders.slice(3), [leaders])

  async function loadLeaderboard() {
    setLoading(true)
    const res = await getLeaderboard()
    if (res?.error) {
      setMessage({ type: "error", text: `Could not load leaderboard: ${res.error?.message || res.error}` })
      setLeaders([])
    } else {
      setLeaders(res?.data || [])
      setMessage(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav active="leaderboard" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Community legends</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Suggestion leaderboard</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            Stars are earned when people make good suggestions: movies, series, and games get points when nominated, watched or played, and highly rated. Videos get points when uploaded and when they become classics.
          </p>
        </section>

        {message ? <div className="mb-4 rounded-2xl bg-red-600 p-3">{message.text}</div> : null}
        {loading ? <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-neutral-400">Loading leaderboard...</div> : null}

        {!loading && leaders.length === 0 ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 text-neutral-400">
            No leaderboard points yet. Add movies, series, games, or videos to start the competition.
          </section>
        ) : null}

        {topThree.length > 0 ? (
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {topThree.map((person, index) => (
              <article key={person.handle} className={`rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 ${index === 0 ? "md:-mt-2" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-4xl"><Medal rank={index + 1} /></div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-neutral-950">{person.total} ⭐</div>
                </div>
                <h2 className="mt-4 truncate text-2xl font-bold">{person.handle}</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatPill label="Movies" value={person.breakdown.movies} />
                  <StatPill label="Series" value={person.breakdown.series} />
                  <StatPill label="Games" value={person.breakdown.games} />
                  <StatPill label="Videos" value={person.breakdown.videos} />
                </div>
                {person.activity?.length ? (
                  <div className="mt-4 space-y-2">
                    {person.activity.slice(0, 2).map((item) => (
                      <div key={item.id} className="rounded-2xl bg-neutral-950/70 p-3 text-sm text-neutral-300">
                        <span className="font-semibold text-white">+{item.points} ⭐</span> {item.reason}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Full ranking</p>
                <h2 className="mt-1 text-2xl font-semibold">Everyone else</h2>
              </div>
              <button type="button" onClick={loadLeaderboard} className="rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950">Refresh</button>
            </div>

            <div className="space-y-3">
              {rest.map((person, index) => (
                <article key={person.handle} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-lg font-bold"><Medal rank={index + 4} /></div>
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-bold">{person.handle}</h3>
                        <p className="text-sm text-neutral-500">{person.activity.length} scoring moment{person.activity.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-white px-3 py-1.5 font-bold text-neutral-950">{person.total} ⭐</span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-400">🎬 {person.breakdown.movies}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-400">📺 {person.breakdown.series}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-400">🎮 {person.breakdown.games}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5 text-neutral-400">📹 {person.breakdown.videos}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
