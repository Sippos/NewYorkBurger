import { useEffect, useRef, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import MovieRanking from "../components/MovieRanking"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { searchMovies } from "../lib/tmdb"
import { addNomination, getMyVotes, getNominations, getWatched, markWatchedWithRating, setRating, voteMovie } from "../lib/supabaseClient"

const LOBBY_ID = "global"
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function Movies() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY
  const activeHandle = getSavedHandle()
  const hasResults = results.length > 0
  const canUseApp = Boolean(activeHandle)

  async function loadNominations() {
    if (!activeHandle) return
    try {
      const nominationsRes = await getNominations(LOBBY_ID)
      if (nominationsRes?.error) { setActionMessage({ type: "error", text: "Could not load movie nominations." }); return }
      const allMovies = (nominationsRes?.data || []).map((n) => ({ id: n.movie_id, title: n.title, poster: n.poster, nominated_by: n.nominated_by }))
      const myVotes = await getMyVotes(LOBBY_ID, activeHandle)
      const votedIds = new Set(myVotes.map((vote) => vote.movie_id))
      setQueue(allMovies.filter((movie) => !votedIds.has(movie.id)))
    } catch { setActionMessage({ type: "error", text: "Could not load your previous movie votes." }) }
  }

  async function loadWatched() { if (!activeHandle) return; const res = await getWatched(activeHandle); if (res?.data) setWatched(res.data) }
  function clearSearch() { setQuery(""); setResults([]); setTimeout(() => deckRef.current?.scrollIntoView({ behavior: "smooth" }), 50) }

  useEffect(() => { loadNominations(); loadWatched() }, [activeHandle])

  async function handleSearch(e) { e.preventDefault(); if (!query.trim()) return; if (!canUseApp) { setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." }); return } setResults(await searchMovies(apiKey, query)) }
  async function handleAddMovie(movie) { if (!canUseApp) { setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." }); return } const res = await addNomination(movie, activeHandle, LOBBY_ID); if (res?.error) setActionMessage({ type: "error", text: `Could not add movie: ${String(res.error.message || res.error)}` }); else { setActionMessage({ type: "success", text: `"${movie.title}" added to the swipe pile.` }); await loadNominations(); clearSearch() } setTimeout(() => setActionMessage(null), 2500) }
  async function handleSwipe(vote, movie) { if (!canUseApp) return; const res = await voteMovie(movie, vote, LOBBY_ID, activeHandle); if (res?.error) { setActionMessage({ type: "error", text: "Vote could not be saved." }); return } setQueue((current) => current.filter((item) => item.id !== movie.id)); setRankingRefreshKey((current) => current + 1); setActionMessage({ type: "success", text: vote === "like" ? `You voted to watch "${movie.title}".` : `You passed on "${movie.title}".` }); setTimeout(() => setActionMessage(null), 2200) }
  async function handleRating(movieId, rating) { if (!canUseApp) return; await setRating(movieId, rating, activeHandle); await loadWatched() }
  async function handleMarkWatched(movie) { if (!canUseApp) return; await markWatchedWithRating(movie, activeHandle, null); await loadWatched(); setActionMessage({ type: "success", text: `"${movie.title}" moved to watched.` }); setTimeout(() => setActionMessage(null), 2500) }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6"><div className="mx-auto max-w-5xl"><PageNav active="movies" />
      <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5"><div className="min-w-0"><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Movie night</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to watch</h1><p className="mt-3 max-w-2xl text-neutral-400">Search movies, add them to the pile, and vote with your navbar profile.</p>{!canUseApp ? <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create a profile with the Profile button in the navbar before voting or adding movies.</p> : null}</div><form onSubmit={handleSearch} className="mt-4"><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30" placeholder="Search a movie..." value={query} onChange={(e) => setQuery(e.target.value)} />{hasResults ? <button type="button" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950" onClick={clearSearch}>Back</button> : null}<button className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:px-5">Search</button></div></form></section>
      {!apiKey ? <div className="mb-4 rounded-2xl bg-yellow-500 p-3 text-black">TMDB API key missing. Add VITE_TMDB_KEY to your .env file.</div> : null}{actionMessage ? <div className={`mb-4 rounded-2xl p-3 ${actionMessage.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{actionMessage.text}</div> : null}
      {hasResults ? <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Search results</h2><button className="text-sm text-neutral-400 hover:text-white" onClick={clearSearch}>Back to swipe deck</button></div><div className="space-y-2">{results.map((movie) => <div key={movie.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">{movie.poster ? <img src={movie.poster} className="w-14 rounded-xl" alt="" /> : null}<div className="min-w-0 flex-1"><strong className="block truncate">{movie.title}</strong><div className="text-sm text-neutral-400">{movie.year || "Unknown year"}</div></div><button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white hover:text-neutral-950" onClick={() => handleAddMovie(movie)}>Add</button><button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950" onClick={() => handleMarkWatched(movie)}>Watched</button></div>)}</div></section> : null}
      {canUseApp ? <><section ref={deckRef} className="mb-8"><SwipeDeck movies={queue} onSwipe={handleSwipe} /></section><MovieRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={activeHandle} /></> : null}
      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">After watching</p><h2 className="mt-1 text-2xl font-semibold">Watched ranking</h2></div><div className="text-sm text-neutral-500">Sorted by average rating</div></div>{watched.length === 0 ? <p className="text-neutral-400">No watched movies yet.</p> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{watched.map((movie) => <div key={movie.id} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-3"><div className="flex gap-3">{movie.poster ? <img src={movie.poster} alt="" className="h-28 w-20 shrink-0 rounded-2xl object-cover" /> : null}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-lg leading-tight">{movie.title}</strong><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950">{movie.avgRating === null ? "No rating" : `${movie.avgRating}/10`}</span></div><div className="mt-1 text-xs text-neutral-500">{movie.ratingCount || 0} rating{movie.ratingCount === 1 ? "" : "s"}</div><div className="mt-3 grid grid-cols-5 gap-1.5">{RATINGS.map((rating) => <button key={rating} type="button" className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${Number(movie.rating) === rating ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30"}`} onClick={() => handleRating(movie.movie_id, rating)}>{rating}</button>)}</div></div></div></div>)}</div>}</section>
    </div></div>
  )
}
