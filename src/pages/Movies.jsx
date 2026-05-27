import { useEffect, useRef, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import MovieRanking from "../components/MovieRanking"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { getMovieDetails, searchMovies } from "../lib/tmdb"
import { addNomination, getMyVotes, getNominations, getWatched, markWatchedWithRating, setRating, voteMovie } from "../lib/supabaseClient"

const LOBBY_ID = "global"
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function DetailPill({ children }) {
  if (!children) return null
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300">{children}</span>
}

function displayYear(value) {
  const year = String(value || "").match(/\d{4}/)?.[0]
  return year || ""
}

function getWatchedMovieKey(movie) {
  return String(movie?.movie_id || movie?.id || "")
}

export default function Movies() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)
  const [infoMovie, setInfoMovie] = useState(null)
  const [loadingInfoMovie, setLoadingInfoMovie] = useState(false)
  const [ratingEditorOpen, setRatingEditorOpen] = useState({})

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY
  const activeHandle = getSavedHandle()
  const hasResults = results.length > 0
  const canUseApp = Boolean(activeHandle)

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
    if (!res?.data) return

    const watchedMovies = res.data
    setWatched(watchedMovies)

    if (!apiKey) return

    const enriched = await Promise.all(
      watchedMovies.map(async (movie) => {
        const movieId = movie.movie_id || movie.id
        const details = await getMovieDetails(apiKey, movieId)
        if (!details) return movie
        return {
          ...movie,
          ...details,
          id: movie.id,
          movie_id: movie.movie_id,
          avgRating: movie.avgRating,
          rating: movie.rating,
          ratingCount: movie.ratingCount,
        }
      })
    )

    setWatched(enriched)
  }

  function clearSearch() {
    setQuery("")
    setResults([])
    setTimeout(() => deckRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  useEffect(() => {
    loadNominations()
    loadWatched()
  }, [activeHandle])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    if (!canUseApp) {
      setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." })
      return
    }
    setResults(await searchMovies(apiKey, query))
  }

  async function handleAddMovie(movie) {
    if (!canUseApp) {
      setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." })
      return
    }
    const res = await addNomination(movie, activeHandle, LOBBY_ID)
    if (res?.error) setActionMessage({ type: "error", text: `Could not add movie: ${String(res.error.message || res.error)}` })
    else {
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
    setActionMessage({ type: "success", text: vote === "like" ? `You voted to watch "${movie.title}".` : `You passed on "${movie.title}".` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(movieId, rating) {
    if (!canUseApp) return
    await setRating(movieId, rating, activeHandle)
    setRatingEditorOpen((current) => ({ ...current, [String(movieId)]: false }))
    await loadWatched()
  }

  async function handleMarkWatched(movie) {
    if (!canUseApp) return
    await markWatchedWithRating(movie, activeHandle, null)
    await loadWatched()
    setActionMessage({ type: "success", text: `"${movie.title}" moved to watched.` })
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function openWatchedMovieInfo(movie) {
    setLoadingInfoMovie(true)
    const movieId = movie.movie_id || movie.id
    const details = await getMovieDetails(apiKey, movieId)
    setInfoMovie({ ...movie, ...(details || {}) })
    setLoadingInfoMovie(false)
  }

  function toggleRatingEditor(movie) {
    const key = getWatchedMovieKey(movie)
    if (!key) return
    setRatingEditorOpen((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav active="movies" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Movie night</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to watch</h1>
            <p className="mt-3 max-w-2xl text-neutral-400">Search movies, add them to the pile, and vote with your navbar profile.</p>
            {!canUseApp ? <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create a profile with the Profile button in the navbar before voting or adding movies.</p> : null}
          </div>
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30" placeholder="Search a movie..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {hasResults ? <button type="button" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950" onClick={clearSearch}>Back</button> : null}
              <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:px-5">Search</button>
            </div>
          </form>
        </section>

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

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">After watching</p>
              <h2 className="mt-1 text-2xl font-semibold">Watched ranking</h2>
            </div>
            <div className="text-sm text-neutral-500">Sorted by average rating</div>
          </div>

          {watched.length === 0 ? <p className="text-neutral-400">No watched movies yet.</p> : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {watched.map((movie) => {
                const movieKey = getWatchedMovieKey(movie)
                const hasMyRating = Number(movie.rating) > 0
                const isRatingOpen = !hasMyRating || ratingEditorOpen[movieKey]
                const ratingLabel = hasMyRating ? `${movie.rating}/10` : movie.avgRating === null ? "Rate" : `${movie.avgRating}/10`

                return (
                  <div key={movie.id} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-3 transition hover:border-white/20">
                    <div className="flex gap-3">
                      {movie.poster ? (
                        <button type="button" onClick={() => openWatchedMovieInfo(movie)} className="group h-28 w-20 shrink-0 overflow-hidden rounded-2xl text-left" title={`Open ${movie.title} details`}>
                          <img src={movie.poster} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => openWatchedMovieInfo(movie)} className="flex h-28 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-neutral-900 px-2 text-center text-xs font-semibold text-neutral-400 hover:bg-white hover:text-neutral-950">
                          Details
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <strong className="line-clamp-2 text-lg leading-tight">{movie.title}</strong>
                          <button type="button" onClick={() => toggleRatingEditor(movie)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200" title="Change your rating">
                            {ratingLabel}
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">{movie.ratingCount || 0} rating{movie.ratingCount === 1 ? "" : "s"}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {movie.tmdbRating ? <DetailPill>TMDB ★ {Number(movie.tmdbRating).toFixed(1)}</DetailPill> : null}
                          {displayYear(movie.released || movie.year) ? <DetailPill>{displayYear(movie.released || movie.year)}</DetailPill> : null}
                          {movie.runtime ? <DetailPill>{movie.runtime} min</DetailPill> : null}
                        </div>
                        {movie.genres?.length ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{movie.genres.join(" · ")}</div> : null}
                        <button type="button" onClick={() => openWatchedMovieInfo(movie)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">
                          <span aria-hidden="true">ⓘ</span>
                          Movie details
                        </button>
                        {isRatingOpen ? (
                          <div className="mt-3 grid grid-cols-5 gap-1.5">
                            {RATINGS.map((rating) => (
                              <button key={rating} type="button" className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${Number(movie.rating) === rating ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30"}`} onClick={() => handleRating(movie.movie_id, rating)}>{rating}</button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {infoMovie || loadingInfoMovie ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            {loadingInfoMovie ? (
              <div className="py-16 text-center text-neutral-400">Loading movie info...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold leading-tight">{infoMovie.title}</h3>
                    {displayYear(infoMovie.released || infoMovie.year) ? <div className="mt-1 text-sm text-neutral-400">{displayYear(infoMovie.released || infoMovie.year)}</div> : null}
                  </div>
                  <button type="button" onClick={() => setInfoMovie(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-neutral-300 transition hover:bg-white hover:text-black">×</button>
                </div>

                {infoMovie.backdrop ? <img src={infoMovie.backdrop} alt="" className="mt-5 h-44 w-full rounded-3xl object-cover" /> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {infoMovie.tmdbRating ? <DetailPill>TMDB ★ {Number(infoMovie.tmdbRating).toFixed(1)}</DetailPill> : null}
                  {infoMovie.runtime ? <DetailPill>{infoMovie.runtime} min</DetailPill> : null}
                  {infoMovie.avgRating === null || infoMovie.avgRating === undefined ? null : <DetailPill>Group ★ {infoMovie.avgRating}/10</DetailPill>}
                </div>

                {infoMovie.genres?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Genres</div>
                    <div className="mt-2 flex flex-wrap gap-2">{infoMovie.genres.map((genre) => <DetailPill key={genre}>{genre}</DetailPill>)}</div>
                  </div>
                ) : null}

                <p className="mt-5 text-sm leading-7 text-neutral-300">{infoMovie.overview || "No movie description available."}</p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
