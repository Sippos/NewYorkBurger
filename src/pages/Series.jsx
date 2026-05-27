import { useEffect, useRef, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import SeriesRanking from "../components/SeriesRanking"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { getSeriesDetails, searchSeries } from "../lib/tmdb"
import { addSeriesNomination, getMySeriesVotes, getSeriesNominations, getWatchedSeries, markSeriesWatchedWithRating, setSeriesRating, voteSeries } from "../lib/supabaseClient"

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

function getWatchedSeriesKey(series) {
  return String(series?.series_id || series?.id || "")
}

export default function Series() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)
  const [infoSeries, setInfoSeries] = useState(null)
  const [loadingInfoSeries, setLoadingInfoSeries] = useState(false)
  const [ratingEditorOpen, setRatingEditorOpen] = useState({})

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY
  const activeHandle = getSavedHandle()
  const hasResults = results.length > 0
  const canUseApp = Boolean(activeHandle)

  async function loadNominations() {
    if (!activeHandle) return
    try {
      const nominationsRes = await getSeriesNominations(LOBBY_ID)
      if (nominationsRes?.error) {
        setActionMessage({ type: "error", text: "Could not load series nominations." })
        return
      }
      const allSeries = (nominationsRes?.data || []).map((series) => ({
        id: series.series_id,
        title: series.title,
        poster: series.poster,
        nominated_by: series.nominated_by,
      }))
      const myVotes = await getMySeriesVotes(LOBBY_ID, activeHandle)
      const votedIds = new Set(myVotes.map((vote) => vote.series_id))
      setQueue(allSeries.filter((series) => !votedIds.has(series.id)))
    } catch {
      setActionMessage({ type: "error", text: "Could not load your previous series votes." })
    }
  }

  async function loadWatched() {
    if (!activeHandle) return
    const res = await getWatchedSeries(activeHandle)
    if (!res?.data) return

    const watchedSeries = res.data
    setWatched(watchedSeries)

    if (!apiKey) return

    const enriched = await Promise.all(
      watchedSeries.map(async (series) => {
        const seriesId = series.series_id || series.id
        const details = await getSeriesDetails(apiKey, seriesId)
        if (!details) return series
        return {
          ...series,
          ...details,
          id: series.id,
          series_id: series.series_id,
          avgRating: series.avgRating,
          rating: series.rating,
          ratingCount: series.ratingCount,
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
    setResults(await searchSeries(apiKey, query))
  }

  async function handleAddSeries(series) {
    if (!canUseApp) {
      setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." })
      return
    }
    const res = await addSeriesNomination(series, activeHandle, LOBBY_ID)
    if (res?.error) setActionMessage({ type: "error", text: `Could not add series: ${String(res.error.message || res.error)}` })
    else {
      setActionMessage({ type: "success", text: `"${series.title}" added to the swipe pile.` })
      await loadNominations()
      clearSearch()
    }
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function handleSwipe(vote, series) {
    if (!canUseApp) return
    const res = await voteSeries(series, vote, LOBBY_ID, activeHandle)
    if (res?.error) {
      setActionMessage({ type: "error", text: "Vote could not be saved." })
      return
    }
    setQueue((current) => current.filter((item) => item.id !== series.id))
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: vote === "like" ? `You voted to watch "${series.title}".` : `You passed on "${series.title}".` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(seriesId, rating) {
    if (!canUseApp) return
    await setSeriesRating(seriesId, rating, activeHandle)
    setRatingEditorOpen((current) => ({ ...current, [String(seriesId)]: false }))
    await loadWatched()
  }

  async function handleMarkWatched(series) {
    if (!canUseApp) return
    await markSeriesWatchedWithRating(series, activeHandle, null)
    await loadWatched()
    setActionMessage({ type: "success", text: `"${series.title}" moved to watched.` })
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function openWatchedSeriesInfo(series) {
    setLoadingInfoSeries(true)
    const seriesId = series.series_id || series.id
    const details = await getSeriesDetails(apiKey, seriesId)
    setInfoSeries({ ...series, ...(details || {}) })
    setLoadingInfoSeries(false)
  }

  function toggleRatingEditor(series) {
    const key = getWatchedSeriesKey(series)
    if (!key) return
    setRatingEditorOpen((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav active="series" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Series night</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to binge</h1>
            <p className="mt-3 max-w-2xl text-neutral-400">Search series, add them to the pile, and vote with your navbar profile.</p>
            {!canUseApp ? <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create a profile with the Profile button in the navbar before voting or adding series.</p> : null}
          </div>
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30" placeholder="Search a series..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
              {results.map((series) => (
                <div key={series.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">
                  {series.poster ? <img src={series.poster} className="w-14 rounded-xl" alt="" /> : null}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{series.title}</strong>
                    <div className="text-sm text-neutral-400">{series.year || "Unknown year"}</div>
                  </div>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white hover:text-neutral-950" onClick={() => handleAddSeries(series)}>Add</button>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950" onClick={() => handleMarkWatched(series)}>Watched</button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {canUseApp ? (
          <>
            <section ref={deckRef} className="mb-8">
              <SwipeDeck movies={queue} onSwipe={handleSwipe} itemLabel="series" emptyLabel="No series left to vote on" likeLabel="Watch" dislikeLabel="Pass" infoType="series" loadDetails={(series) => getSeriesDetails(apiKey, series.id)} />
            </section>
            <SeriesRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={activeHandle} />
          </>
        ) : null}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">After watching</p>
              <h2 className="mt-1 text-2xl font-semibold">Watched series ranking</h2>
            </div>
            <div className="text-sm text-neutral-500">Sorted by average rating</div>
          </div>

          {watched.length === 0 ? <p className="text-neutral-400">No watched series yet.</p> : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {watched.map((series) => {
                const seriesKey = getWatchedSeriesKey(series)
                const hasMyRating = Number(series.rating) > 0
                const isRatingOpen = !hasMyRating || ratingEditorOpen[seriesKey]
                const ratingLabel = hasMyRating ? `${series.rating}/10` : series.avgRating === null ? "Rate" : `${series.avgRating}/10`

                return (
                  <div key={series.id} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-3 transition hover:border-white/20">
                    <div className="flex gap-3">
                      {series.poster ? (
                        <button type="button" onClick={() => openWatchedSeriesInfo(series)} className="group h-28 w-20 shrink-0 overflow-hidden rounded-2xl text-left" title={`Open ${series.title} details`}>
                          <img src={series.poster} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => openWatchedSeriesInfo(series)} className="flex h-28 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-neutral-900 px-2 text-center text-xs font-semibold text-neutral-400 hover:bg-white hover:text-neutral-950">
                          Details
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <strong className="line-clamp-2 text-lg leading-tight">{series.title}</strong>
                          <button type="button" onClick={() => toggleRatingEditor(series)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200" title="Change your rating">
                            {ratingLabel}
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">{series.ratingCount || 0} rating{series.ratingCount === 1 ? "" : "s"}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {series.tmdbRating ? <DetailPill>TMDB ★ {Number(series.tmdbRating).toFixed(1)}</DetailPill> : null}
                          {displayYear(series.released || series.year) ? <DetailPill>{displayYear(series.released || series.year)}</DetailPill> : null}
                          {series.numberOfSeasons ? <DetailPill>{series.numberOfSeasons} season{series.numberOfSeasons === 1 ? "" : "s"}</DetailPill> : null}
                        </div>
                        {series.genres?.length ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{series.genres.join(" · ")}</div> : null}
                        <button type="button" onClick={() => openWatchedSeriesInfo(series)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">
                          <span aria-hidden="true">ⓘ</span>
                          Series details
                        </button>
                        {isRatingOpen ? (
                          <div className="mt-3 grid grid-cols-5 gap-1.5">
                            {RATINGS.map((rating) => (
                              <button key={rating} type="button" className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${Number(series.rating) === rating ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30"}`} onClick={() => handleRating(series.series_id, rating)}>{rating}</button>
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

      {infoSeries || loadingInfoSeries ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            {loadingInfoSeries ? (
              <div className="py-16 text-center text-neutral-400">Loading series info...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold leading-tight">{infoSeries.title}</h3>
                    {displayYear(infoSeries.released || infoSeries.year) ? <div className="mt-1 text-sm text-neutral-400">{displayYear(infoSeries.released || infoSeries.year)}</div> : null}
                  </div>
                  <button type="button" onClick={() => setInfoSeries(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-neutral-300 transition hover:bg-white hover:text-black">×</button>
                </div>

                {infoSeries.backdrop ? <img src={infoSeries.backdrop} alt="" className="mt-5 h-44 w-full rounded-3xl object-cover" /> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {infoSeries.tmdbRating ? <DetailPill>TMDB ★ {Number(infoSeries.tmdbRating).toFixed(1)}</DetailPill> : null}
                  {infoSeries.numberOfSeasons ? <DetailPill>{infoSeries.numberOfSeasons} season{infoSeries.numberOfSeasons === 1 ? "" : "s"}</DetailPill> : null}
                  {infoSeries.numberOfEpisodes ? <DetailPill>{infoSeries.numberOfEpisodes} episode{infoSeries.numberOfEpisodes === 1 ? "" : "s"}</DetailPill> : null}
                  {infoSeries.status ? <DetailPill>{infoSeries.status}</DetailPill> : null}
                  {infoSeries.avgRating === null || infoSeries.avgRating === undefined ? null : <DetailPill>Group ★ {infoSeries.avgRating}/10</DetailPill>}
                </div>

                {infoSeries.genres?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Genres</div>
                    <div className="mt-2 flex flex-wrap gap-2">{infoSeries.genres.map((genre) => <DetailPill key={genre}>{genre}</DetailPill>)}</div>
                  </div>
                ) : null}

                <p className="mt-5 text-sm leading-7 text-neutral-300">{infoSeries.overview || "No series description available."}</p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
