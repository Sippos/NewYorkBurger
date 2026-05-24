import { useEffect, useRef, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import MovieRanking from "../components/MovieRanking"
import PageNav from "../components/PageNav"
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
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function cleanHandle(handle) { return String(handle || "").trim() }

function getSavedHandles() {
  try {
    const raw = JSON.parse(localStorage.getItem("movie_handles") || "[]")
    const clean = raw.filter(Boolean).map((item) => cleanHandle(item)).filter((item) => item.length >= 2).filter((item) => !BLOCKED_HANDLES.has(item.toLowerCase()))
    return [...new Map(clean.map((item) => [item.toLowerCase(), item])).values()].slice(0, 5)
  } catch { return [] }
}

function saveHandle(handle) {
  const clean = cleanHandle(handle)
  if (clean.length < 2 || BLOCKED_HANDLES.has(clean.toLowerCase())) return
  const handles = getSavedHandles()
  const next = [clean, ...handles.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5)
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
  const isAdmin = activeHandle.trim().toLowerCase() === "sip"

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

  function switchHandle() { setDraftHandle(activeHandle); setIsChoosingHandle(true) }

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

  async function handleResetVotes() {
    if (!activeHandle || !isAdmin) return
    if (!window.confirm(`Reset all votes for "${activeHandle}" in this lobby?`)) return
    const res = await resetVotesForVoter(LOBBY_ID, activeHandle)
    if (res?.error) { setActionMessage({ type: "error", text: `Could not reset your votes: ${res.error?.message || String(res.error)}` }); return }
    await loadNominations(); setRankingRefreshKey((current) => current + 1); setActionMessage({ type: "success", text: `Votes reset for ${activeHandle}.` }); setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleResetAllVotes() {
    if (!isAdmin) return
    if (!window.confirm("Reset all votes for everyone in this lobby? This is only for testing.")) return
    const res = await resetAllVotes(LOBBY_ID)
    if (res?.error) { setActionMessage({ type: "error", text: `Could not reset all votes: ${res.error?.message || String(res.error)}` }); return }
    await loadNominations(); setRankingRefreshKey((current) => current + 1); setActionMessage({ type: "success", text: "All votes were reset." }); setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRestoreVoting() { if (!isAdmin) return; await resetVotesForVoter(LOBBY_ID, activeHandle); await loadNominations(); setRankingRefreshKey((current) => current + 1); setActionMessage({ type: "success", text: `Your voting cards were restored.` }); setTimeout(() => setActionMessage(null), 2200) }
  async function handleRemoveWatched(movieId) { if (!isAdmin) return; await deleteWatchedByMovieId(movieId); await loadWatched() }

  useEffect(() => { refreshSavedHandles() }, [])
  useEffect(() => { loadNominations(); loadWatched() }, [activeHandle])

  async function handleSearch(e) { e.preventDefault(); if (!query.trim() || !canUseApp) return; setResults(await searchMovies(apiKey, query)) }
  async function handleAddMovie(movie) {
    if (!canUseApp) return
    const res = await addNomination(movie, activeHandle, LOBBY_ID)
    if (res?.error) setActionMessage({ type: "error", text: `Could not add movie: ${String(res.error.message || res.error)}` })
    else { setActionMessage({ type: "success", text: `"${movie.title}" added to the swipe pile.` }); await loadNominations(); clearSearch() }
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function handleSwipe(vote, movie) {
    if (!canUseApp) return
    const res = await voteMovie(movie, vote, LOBBY_ID, activeHandle)
    if (res?.error) { setActionMessage({ type: "error", text: "Vote could not be saved." }); return }
    setQueue((current) => current.filter((item) => item.id !== movie.id)); setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: vote === "like" ? `You voted to watch "${movie.title}".` : `You passed on "${movie.title}".` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(movieId, rating) { await setRating(movieId, rating, activeHandle); await loadWatched() }
  async function handleMarkWatched(movie) { if (!canUseApp) return; await markWatchedWithRating(movie, activeHandle, null); await loadWatched(); setActionMessage({ type: "success", text: `"${movie.title}" moved to watched.` }); setTimeout(() => setActionMessage(null), 2500) }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav title="Movie Night" active="movies" right={<div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{LOBBY_ID}</div>} />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Movie night</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to watch</h1>{!activeHandle ? <p className="mt-1 text-sm text-neutral-500">Choose your handle to start voting.</p> : null}</div>
            {isChoosingHandle ? (
              <div className="w-full rounded-3xl border border-white/10 bg-neutral-950/70 p-3 lg:max-w-xl"><div className="flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30" value={draftHandle} onChange={(e) => setDraftHandle(e.target.value)} placeholder="Choose handle" /><button type="button" className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200" onClick={() => continueAs()}>Continue</button></div>{savedHandles.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{savedHandles.map((handle) => <button key={handle} type="button" className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300 transition hover:border-white/30 hover:text-white" onClick={() => continueAs(handle)}>{handle}</button>)}</div> : null}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-neutral-950/70 px-2 py-2 sm:px-3"><span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-950">{activeHandle}</span><button type="button" className="rounded-full px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white" onClick={switchHandle}>Switch</button>{isAdmin ? <><button type="button" className="rounded-full px-3 py-1.5 text-sm text-neutral-400 transition hover:bg-white/10 hover:text-white" onClick={handleResetVotes}>Reset mine</button><button type="button" className="rounded-full px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-400 hover:text-neutral-950" onClick={handleResetAllVotes}>Reset all</button></> : null}</div>
            )}
          </div>
          <form onSubmit={handleSearch} className="mt-4"><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30 disabled:opacity-40" placeholder={canUseApp ? "Search a movie..." : "Choose a handle first"} value={query} disabled={!canUseApp} onChange={(e) => setQuery(e.target.value)} />{hasResults ? <button type="button" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950" onClick={clearSearch}>Back</button> : null}<button disabled={!canUseApp} className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-40 sm:px-5">Search</button></div></form>
        </section>

        {!apiKey ? <div className="mb-4 rounded-2xl bg-yellow-500 p-3 text-black">TMDB API key missing. Add VITE_TMDB_KEY to your .env file.</div> : null}
        {actionMessage ? <div className={`mb-4 rounded-2xl p-3 ${actionMessage.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{actionMessage.text}</div> : null}

        {hasResults ? <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Search results</h2><button className="text-sm text-neutral-400 hover:text-white" onClick={clearSearch}>Back to swipe deck</button></div><div className="space-y-2">{results.map((movie) => <div key={movie.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">{movie.poster ? <img src={movie.poster} className="w-14 rounded-xl" alt="" /> : null}<div className="min-w-0 flex-1"><strong className="block truncate">{movie.title}</strong><div className="text-sm text-neutral-400">{movie.year || "Unknown year"}</div></div><button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white hover:text-neutral-950" onClick={() => handleAddMovie(movie)}>Add</button><button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950" onClick={() => handleMarkWatched(movie)}>Watched</button></div>)}</div></section> : null}

        {canUseApp ? <><section ref={deckRef} className="mb-8"><SwipeDeck movies={queue} onSwipe={handleSwipe} /></section><MovieRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={activeHandle} /></> : null}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">After watching</p><h2 className="mt-1 text-2xl font-semibold">Watched ranking</h2></div><div className="text-sm text-neutral-500">Sorted by average rating</div></div>{watched.length === 0 ? <p className="text-neutral-400">No watched movies yet.</p> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{watched.map((movie) => <div key={movie.id} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-3"><div className="flex gap-3">{movie.poster ? <img src={movie.poster} alt="" className="h-28 w-20 shrink-0 rounded-2xl object-cover" /> : null}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><strong className="line-clamp-2 text-lg leading-tight">{movie.title}</strong><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950">{movie.avgRating === null ? "No rating" : `${movie.avgRating}/10`}</span></div><div className="mt-1 text-xs text-neutral-500">{movie.ratingCount || 0} rating{movie.ratingCount === 1 ? "" : "s"}</div><div className="mt-3 grid grid-cols-5 gap-1.5">{RATINGS.map((rating) => <button key={rating} type="button" className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${Number(movie.rating) === rating ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30"}`} onClick={() => handleRating(movie.movie_id, rating)}>{rating}</button>)}</div></div></div>{isAdmin ? <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3"><button type="button" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white hover:text-neutral-950" onClick={() => handleRestoreVoting(movie)}>Restore voting cards</button><button type="button" className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400 hover:text-neutral-950" onClick={() => handleRemoveWatched(movie.movie_id)}>Remove watched</button></div> : null}</div>)}</div>}</section>
      </div>
    </div>
  )
}
