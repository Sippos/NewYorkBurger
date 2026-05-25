import { useState } from "react"
import PageNav from "../components/PageNav"
import { searchGames } from "../lib/rawg"

export default function Games() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [message, setMessage] = useState(null)
  const apiKey = import.meta.env.VITE_RAWG_API_KEY

  async function handleSearch(e) {
    e.preventDefault()
    setMessage(null)

    if (!apiKey) {
      setMessage({ type: "error", text: "RAWG API key missing. Add VITE_RAWG_API_KEY to your .env file." })
      return
    }

    if (!query.trim()) return

    const games = await searchGames(apiKey, query)
    setResults(games)
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav active="games" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Game night</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to play</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">Search games from RAWG. Voting and played rankings can be layered onto this page next.</p>

          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30"
                placeholder="Search a game..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:px-5">Search</button>
            </div>
          </form>
        </section>

        {!apiKey ? (
          <div className="mb-4 rounded-2xl bg-yellow-500 p-3 text-black">RAWG API key missing. Add VITE_RAWG_API_KEY to your .env file.</div>
        ) : null}

        {message ? (
          <div className={`mb-4 rounded-2xl p-3 ${message.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{message.text}</div>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <h2 className="mb-3 font-semibold">Search results</h2>

          {results.length === 0 ? (
            <p className="text-neutral-400">No games searched yet.</p>
          ) : (
            <div className="space-y-2">
              {results.map((game) => (
                <div key={game.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">
                  {game.poster ? <img src={game.poster} className="h-20 w-14 rounded-xl object-cover" alt="" /> : null}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{game.title}</strong>
                    <div className="text-sm text-neutral-400">{game.year || "Unknown year"}</div>
                    {game.platforms?.length ? <div className="mt-1 line-clamp-1 text-xs text-neutral-500">{game.platforms.join(", ")}</div> : null}
                  </div>
                  {game.rawgRating ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950">★ {game.rawgRating}</span> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
