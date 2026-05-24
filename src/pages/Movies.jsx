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
  resetAllVotes,
  resetVotesForVoter,
  setRating,
  voteMovie,
} from "../lib/supabaseClient"

const LOBBY_ID = "global"
const BLOCKED_HANDLES = new Set(["ni", "nic"])

function cleanHandle(handle) {
  return String(handle || "").trim()
}

function getSavedHandles() {
  try {
    const raw = JSON.parse(localStorage.getItem("movie_handles") || "[]")
    const clean = raw
      .filter(Boolean)
      .map((item) => cleanHandle(item))
      .filter((item) => item.length >= 2)
      .filter((item) => !BLOCKED_HANDLES.has(item.toLowerCase()))

    return [...new Map(clean.map((item) => [item.toLowerCase(), item])).values()].slice(0, 5)
  } catch {
    return []
  }
}

function saveHandle(handle) {
  const clean = cleanHandle(handle)
  if (clean.length < 2) return
  if (BLOCKED_HANDLES.has(clean.toLowerCase())) return

  const handles = getSavedHandles()
  const next = [
    clean,
    ...handles.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
  ].slice(0, 5)

  localStorage.setItem("movie_handles", JSON.stringify(next))
}

export default function Movies() {
  const initialHandle = cleanHandle(localStorage.getItem("rater") || "")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [savedHandles, setSavedHandles] = useState(() => getSavedHandles())
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)
  const [activeHandle, setActiveHandle] = useState(initialHandle)
  const [draftHandle, setDraftHandle] = useState(initialHandle)
  const [isChoosingHandle, setIsChoosingHandle] = useState(!initialHandle)

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY
  const hasResults = results.length > 0
  const canUseApp = Boolean(activeHandle)

  function refreshSavedHandles() {
    const cleaned = getSavedHandles()
    localStorage.setItem("movie_handles", JSON.stringify(cleaned))
    setSavedHandles(cleaned)
  }

  function continueAs(handleValue = draftHandle) {
    const clean = cleanHandle(handleValue)

    if (clean.length < 2) {
      setActionMessage({ type: "error", text: "Choose a handle with at least 2 characters." })
      setTimeout(() => setActionMessage(null), 2200)
      return
    }

    saveHandle(clean)
    localStorage.setItem("rater", clean)
    setActiveHandle(clean)
    setDraftHandle(clean)
    setIsChoosingHandle(false)
    refreshSavedHandles()
  }

  function switchHandle() {
    setDraftHandle(activeHandle)
    setIsChoosingHandle(true)
  }

  async function loadNominations() {
    if (!activeHandle) return

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

      const myVotes = await getMyVotes(LOBBY_ID, activeHandle)
      const votedIds = new Set(myVotes.map((vote) => vote.movie_id))
      setQueue(allMovies.filter((movie) => !votedIds.has(movie.id)))
    } catch {
      setActionMessage({ type: "error", text: "Could not load your previous movie votes." })
    }
  }

  async function loadWatched() {
    if (!activeHandle) return
    const res = await getWatched(activeHandle)
    if (res?.data) setWatched(res.data)
  }

  function clearSearch() {
    setQuery("")
    setResults([])
    setTimeout(() => deckRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  async function handleResetVotes() {
    if (!activeHandle) return

    const ok = window.confirm(`Reset all votes for "${activeHandle}" in this lobby?`)
    if (!ok) return

    const res = await resetVotesForVoter(LOBBY_ID, activeHandle)
    if (res?.error) {
      const message = res.error?.message || String(res.error)
      setActionMessage({ type: "error", text: `Could not reset your votes: ${message}` })
      return
    }

    await loadNominations()
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: `Votes reset for ${activeHandle}.` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleResetAllVotes() {
    const ok = window.confirm("Reset all votes for everyone in this lobby? This is only for testing.")
    if (!ok) return

    const res = await resetAllVotes(LOBBY_ID)
    if (res?.error) {
      const message = res.error?.message || String(res.error)
      setActionMessage({ type: "error", text: `Could not reset all votes: ${message}` })
      return
    }

    await loadNominations()
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: "All votes were reset." })
    setTimeout(() => setActionMessage(null), 2200)
  }

  useEffect(() => {
    refreshSavedHandles()
  }, [])

  useEffect(() => {
    loadNominations()
    loadWatched()
  }, [activeHandle])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim() || !canUseApp) return

    const movies = await searchMovies(apiKey, query)
    setResults(movies)
  }

  async function handleAddMovie(movie) {
    if (!canUseApp) return

    const res = await addNomination(movie, activeHandle, LOBBY_ID)

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
    if (!canUseApp) return

    const res = await voteMovie(movie, vote, LOBBY_ID, activeHandle)

    if (res?.error) {
      setActionMessage({ type: "error", text: "Vote could not be saved." })
      return
    }

    setQueue((current) => current.filter((item) => item.id !== movie.id))
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({
      type: "success",
      text: vote === "like" ? `You voted to watch "${movie.title}".` : `You passed on "${movie.title}".`,
    })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(movieId, rating) {
    await setRating(movieId, rating, activeHandle)
    await loadWatched()
  }

  async function handleMarkWatched(movie) {
    if (!canUseApp) return

    const answer = window.prompt("Rate this movie 0-10 optional", "8")
    const rating = answer === null || answer === "" ? null : Number(answer)

    if (rating !== null && Number.isNaN(rating)) {
      setActionMessage({ type: "error", text: "Invalid rating." })
      setTimeout(() => setActionMessage(null), 2000)
      return
    }

    await markWatchedWithRating(movie, activeHandle, rating)
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
            Choose a handle first. Your swipes are stored under that handle.
          </p>

          {isChoosingHandle ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-neutral-950/60 p-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">Create or choose handle</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30"
                  value={draftHandle}
                  onChange={(e) => setDraftHandle(e.target.value)}
                  placeholder="for example sip"
                />
                <button
                  type="button"
                  className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  onClick={() => continueAs()}
                >
                  Continue
                </button>
              </div>

              {savedHandles.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {savedHandles.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300 transition hover:border-white/30 hover:text-white"
                      onClick={() => continueAs(handle)}
                    >
                      Continue as {handle}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Voting as</div>
                <div className="mt-1 text-2xl font-semibold">{activeHandle}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-2xl border border-white/10 px-4 py-2 text-sm hover:bg-white hover:text-neutral-950" onClick={switchHandle}>Switch handle</button>
                <button type="button" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-neutral-300 hover:bg-white hover:text-neutral-950" onClick={handleResetVotes}>Reset my votes</button>
                <button type="button" className="rounded-2xl border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-400 hover:text-neutral-950" onClick={handleResetAllVotes}>Reset all votes</button>
              </div>
            </div>
          )}

          <form onSubmit={handleSearch} className="mt-5">
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">Search movies</label>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30 disabled:opacity-40"
                placeholder={canUseApp ? "Movie title..." : "Choose a handle first"}
                value={query}
                disabled={!canUseApp}
                onChange={(e) => setQuery(e.target.value)}
              />
              {hasResults ? (
                <button type="button" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950" onClick={clearSearch}>Back</button>
              ) : null}
              <button disabled={!canUseApp} className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-40">Search</button>
            </div>
          </form>
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

        {canUseApp ? (
          <>
            <section ref={deckRef} className="mb-8">
              <SwipeDeck movies={queue} onSwipe={handleSwipe} />
            </section>
            <MovieRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={activeHandle} />
          </>
        ) : null}

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
