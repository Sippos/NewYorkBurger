import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import SwipeDeck from "../components/SwipeDeck"
import MovieRanking from "../components/MovieRanking"
import { searchMovies } from "../lib/tmdb"
import {
  addNomination,
  deleteWatchedByMovieId,
  getMyVotes,
  getNominations,
  getWatched,
  markWatchedWithRating,
  resetVotesForVoter,
  setRating,
  voteMovie,
} from "../lib/supabaseClient"

const LOBBY_ID = "global"

function getSavedHandles() {
  try {
    return JSON.parse(localStorage.getItem("movie_handles") || "[]")
  } catch {
    return []
  }
}

function saveHandle(handle) {
  const clean = handle.trim()
  if (!clean) return

  const handles = getSavedHandles()
  const next = [clean, ...handles.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5)
  localStorage.setItem("movie_handles", JSON.stringify(next))
}

export default function Movies() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [savedHandles, setSavedHandles] = useState(() => getSavedHandles())
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)
  const [raterName, setRaterName] = useState(
    () => localStorage.getItem("rater") || "local"
  )

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY
  const hasResults = results.length > 0

  async function loadNominations() {
    try {
      const nominationsRes = await getNominations(LOBBY_ID)

      if (nominationsRes?.error) {
        setActionMessage({ type: "error", text: "Could not load movie nominations." })
        return
      }

      const allMovies = (nominationsRes?.data || []).map((n) => ({
        id: n.movie_id,
        title: n.title,
        poster: n.poster,
        nominated_by: n.nominated_by,
      }))

      const myVotes = await getMyVotes(LOBBY_ID, raterName)
      const votedIds = new Set(myVotes.map((vote) => vote.movie_id))
      setQueue(allMovies.filter((movie) => !votedIds.has(movie.id)))
    } catch {
      setActionMessage({ type: "error", text: "Could not load your previous movie votes." })
    }
  }

  async function loadWatched() {
    const res = await getWatched(raterName)
    if (res?.data) setWatched(res.data)
  }

  function updateHandle(value) {
    setRaterName(value)
    localStorage.setItem("rater", value)
    saveHandle(value)
    setSavedHandles(getSavedHandles())
  }

  function clearSearch() {
    setQuery("")
    setResults([])
    setTimeout(() => deckRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  async function handleResetVotes() {
    const ok = window.confirm(`Reset all votes for "${raterName}" in this lobby?`)
    if (!ok) return

    const res = await resetVotesForVoter(LOBBY_ID, raterName)
    if (res?.error) {
      setActionMessage({ type: "error", text: "Could not reset your votes." })
      return
    }

    await loadNominations()
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: `Votes reset for ${raterName}.` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  useEffect(() => {
    loadNominations()
  }, [raterName])

  useEffect(() => {
    loadWatched()
  }, [raterName])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    saveHandle(raterName)
    setSavedHandles(getSavedHandles())
    const movies = await searchMovies(apiKey, query)
    setResults(movies)
  }

  async function handleAddMovie(movie) {
    const res = await addNomination(movie, raterName, LOBBY_ID)

    if (res?.error) {
      setActionMessage({ type: "error", text: `Could not add movie: ${String(res.error.message || res.error)}` })
    } else {
      setActionMessage({ type: "success", text: `"${movie.title}" added to the swipe pile.` })
      await loadNominations()
      clearSearch()
    }

    setTimeout(() => setActionMessage(null), 2500)
  }

  async function handleSwipe(vote, movie) {
    const res = await voteMovie(movie, vote, LOBBY_ID, raterName)

    if (res?.error) {
      setActionMessage({ type: "error", text: "Vote could not be saved." })
      return
    }

    saveHandle(raterName)
    setSavedHandles(getSavedHandles())
    setQueue((current) => current.filter((item) => item.id !== movie.id))
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({
      type: "success",
      text: vote === "like" ? `You voted to watch "${movie.title}".` : `You passed on "${movie.title}".`,
    })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(movieId, rating) {
    await setRating(movieId, rating, raterName)
    await loadWatched()
  }

  async function handleMarkWatched(movie) {
    const answer = window.prompt("Rate this movie 0-10 optional", "8")
    const rating = answer === null || answer === "" ? null : Number(answer)

    if (rating !== null && Number.isNaN(rating)) {
      setActionMessage({ type: "error", text: "Invalid rating." })
      setTimeout(() => setActionMessage(null), 2000)
      return
    }

    await markWatchedWithRating(movie, raterName, rating)
    await loadWatched()
    setActionMessage({ type: "success", text: `Marked "${movie.title}" as watched.` })
    setTimeout(() => setActionMessage(null), 2500)
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-5 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between text-sm text-neutral-300">
          <div className="flex gap-4">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/movies" className="hover:text-white">Movies</Link>
          </div>
          <div className="text-neutral-500">Lobby: {LOBBY_ID}</div>
        </div>

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 md:p-7">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Movie night</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pick what to watch</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            Continue with a handle, add movies to the pile, then swipe through your own queue.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">Your handle</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30"
                value={raterName}
                onChange={(e) => updateHandle(e.target.value)}
                placeholder="for example sip"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {savedHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      handle.toLowerCase() === raterName.trim().toLowerCase()
                        ? "border-white bg-white text-neutral-950"
                        : "border-white/10 text-neutral-400 hover:border-white/30"
                    }`}
                    onClick={() => updateHandle(handle)}
                  >
                    {handle}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-neutral-500 underline decoration-white/20 underline-offset-4 hover:text-white"
                onClick={handleResetVotes}
              >
                Reset my votes for testing
              </button>
            </div>

            <form onSubmit={handleSearch}>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">Search movies</label>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30"
                  placeholder="Movie title..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {hasResults ? (
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950"
                    onClick={clearSearch}
                  >
                    Back
                  </button>
                ) : null}
                <button className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {!apiKey ? <div className="mb-4 rounded-2xl bg-yellow-500 p-3 text-black">TMDB API key missing. Add VITE_TMDB_KEY to your .env file.</div> : null}
        {actionMessage ? <div className={`mb-4 rounded-2xl p-3 ${actionMessage.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{actionMessage.text}</div> : null}

        {hasResults ? (
          <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Search results</h2>
              <button className="text-sm text-neutral-400 hover:text-white" onClick={clearSearch}>Back to swipe deck</button>
            </div>
            <div className="space-y-2">
              {results.map((movie) => (
                <div key={movie.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">
                  {movie.poster ? <img src={movie.poster} className="w-14 rounded-xl" alt="" /> : null}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{movie.title}</strong>
                    <div className="text-sm text-neutral-400">{movie.year || "Unknown year"}</div>
                  </div>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white hover:text-neutral-950" onClick={() => handleAddMovie(movie)}>Add</button>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950" onClick={() => handleMarkWatched(movie)}>Watched</button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section ref={deckRef} className="mb-8">
          <SwipeDeck movies={queue} onSwipe={handleSwipe} />
        </section>

        <MovieRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={raterName} />

        <section className="mt-8">
          <h2 className="mb-3 text-xl">Watched</h2>
          {watched.length === 0 ? <p className="text-neutral-400">No watched movies yet.</p> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {watched.map((movie) => (
                <div key={movie.id} className="flex items-start gap-3 rounded-2xl bg-neutral-900 p-3">
                  {movie.poster ? <img src={movie.poster} alt="" className="w-20 rounded-xl" /> : null}
                  <div className="flex-1">
                    <strong>{movie.title}</strong>
                    <div className="mt-2">
                      <input type="range" min="0" max="10" value={movie.rating ?? 0} onChange={(e) => handleRating(movie.movie_id, Number(e.target.value))} />
                      <div className="text-sm">Your rating: {movie.rating ?? 0}</div>
                      <div className="text-xs text-neutral-400">Avg: {movie.avgRating ?? 0} ({movie.ratingCount ?? 0})</div>
                    </div>
                    <button className="mt-3 text-sm text-red-400" onClick={async () => { await deleteWatchedByMovieId(movie.movie_id); await loadWatched() }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
