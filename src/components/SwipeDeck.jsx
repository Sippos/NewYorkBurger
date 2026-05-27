import { useEffect, useRef, useState } from "react"
import { getMovieDetails } from "../lib/tmdb"

function DetailPill({ children }) {
  if (!children) return null
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300">{children}</span>
}

function displayYear(value) {
  const year = String(value || "").match(/\d{4}/)?.[0]
  return year || ""
}

export default function SwipeDeck({
  movies = [],
  onSwipe = () => {},
  itemLabel = "movies",
  emptyLabel = null,
  likeLabel = "Watch",
  dislikeLabel = "Pass",
  infoType = "movie",
  loadDetails = null,
}) {
  const [drag, setDrag] = useState(null)
  const [infoMovie, setInfoMovie] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [cardDetails, setCardDetails] = useState({})
  const pointer = useRef({ x: 0, y: 0 })

  const topMovie = movies[0]
  const dragX = drag?.dx || 0
  const watchOpacity = Math.min(Math.max(dragX / 110, 0), 1)
  const passOpacity = Math.min(Math.max(-dragX / 110, 0), 1)
  const apiKey = import.meta.env.VITE_TMDB_KEY

  useEffect(() => {
    if (!topMovie?.id || cardDetails[topMovie.id]) return

    const alreadyHasSmallInfo = Boolean(topMovie.year || topMovie.released || topMovie.genres?.length)
    if (alreadyHasSmallInfo) return

    let cancelled = false

    async function preloadTopCardDetails() {
      const details = loadDetails ? await loadDetails(topMovie) : await getMovieDetails(apiKey, topMovie.id)
      if (cancelled || !details) return
      setCardDetails((current) => current[topMovie.id] ? current : { ...current, [topMovie.id]: details })
    }

    preloadTopCardDetails()

    return () => {
      cancelled = true
    }
  }, [topMovie?.id])

  const handlePointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e

    pointer.current = {
      x: p.clientX,
      y: p.clientY,
    }

    setDrag({ dx: 0, dy: 0 })
  }

  const handlePointerMove = (e) => {
    if (!drag) return

    const p = e.touches ? e.touches[0] : e

    setDrag({
      dx: p.clientX - pointer.current.x,
      dy: p.clientY - pointer.current.y,
    })
  }

  const handlePointerUp = (movie) => {
    if (!drag) return

    const threshold = 120

    if (drag.dx > threshold) onSwipe("like", movie)
    if (drag.dx < -threshold) onSwipe("dislike", movie)

    setDrag(null)
  }

  async function openMovieInfo(movie) {
    setLoadingInfo(true)

    const cachedDetails = cardDetails[movie.id]
    const details = cachedDetails || (loadDetails ? await loadDetails(movie) : await getMovieDetails(apiKey, movie.id))

    setInfoMovie({
      ...movie,
      ...(details || {}),
    })

    if (details && !cachedDetails) {
      setCardDetails((current) => current[movie.id] ? current : { ...current, [movie.id]: details })
    }

    setLoadingInfo(false)
  }

  if (movies.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center shadow-2xl shadow-black/20">
        <h3 className="text-xl font-semibold text-white">
          {emptyLabel || `No ${itemLabel} left to vote on`}
        </h3>
        <p className="mt-2 text-sm text-neutral-500">
          Add more {itemLabel} to the pile or check the ranking below.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Swipe deck</p>
          <h2 className="mt-2 text-3xl font-semibold">Your {itemLabel} pile</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Drag the top card left to {dislikeLabel.toLowerCase()} or right to {likeLabel.toLowerCase()}.
          </p>
        </div>

        <div className="relative h-[620px]">
          {movies.map((movie, index) => {
            const movieWithDetails = { ...movie, ...(cardDetails[movie.id] || {}) }
            const isTop = movie.id === topMovie.id
            const rotation = drag ? drag.dx / 18 : 0
            const year = displayYear(movieWithDetails.released || movieWithDetails.year)

            const style =
              isTop && drag
                ? {
                    transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${rotation}deg)`,
                    transition: "transform 0s",
                  }
                : {
                    transform: `scale(${1 - index * 0.035}) translateY(${index * 14}px)`,
                    transition: "transform 250ms ease",
                  }

            return (
              <div
                key={movie.id}
                className={`absolute left-0 right-0 mx-auto w-[350px] select-none overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 shadow-2xl shadow-black/40 ${
                  isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
                }`}
                style={{ ...style, zIndex: movies.length - index }}
                onMouseDown={isTop ? handlePointerDown : undefined}
                onMouseMove={isTop ? handlePointerMove : undefined}
                onMouseUp={isTop ? () => handlePointerUp(movieWithDetails) : undefined}
                onMouseLeave={isTop ? () => handlePointerUp(movieWithDetails) : undefined}
                onTouchStart={isTop ? handlePointerDown : undefined}
                onTouchMove={isTop ? handlePointerMove : undefined}
                onTouchEnd={isTop ? () => handlePointerUp(movieWithDetails) : undefined}
              >
                <div className="relative h-[440px] bg-neutral-900">
                  {movieWithDetails.poster ? (
                    <img
                      src={movieWithDetails.poster}
                      alt={movieWithDetails.title}
                      draggable="false"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-500 uppercase tracking-[0.25em]">
                      {movieWithDetails.platform || itemLabel}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openMovieInfo(movieWithDetails)
                    }}
                    className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-lg font-bold text-white backdrop-blur transition hover:bg-white hover:text-black"
                  >
                    i
                  </button>

                  {isTop ? (
                    <>
                      <div
                        className="absolute left-6 top-8 -rotate-12 rounded-2xl border-4 border-rose-300 px-5 py-2 text-3xl font-black uppercase tracking-wide text-rose-300"
                        style={{ opacity: passOpacity }}
                      >
                        {dislikeLabel}
                      </div>
                      <div
                        className="absolute right-6 top-8 rotate-12 rounded-2xl border-4 border-emerald-300 px-5 py-2 text-3xl font-black uppercase tracking-wide text-emerald-300"
                        style={{ opacity: watchOpacity }}
                      >
                        {likeLabel}
                      </div>
                    </>
                  ) : null}

                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-3xl font-bold leading-tight">{movieWithDetails.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-300">
                      {year ? <span>{year}</span> : null}
                      {year && movieWithDetails.genres?.length ? <span>·</span> : null}
                      {movieWithDetails.genres?.length ? <span className="line-clamp-1">{movieWithDetails.genres.slice(0, 2).join(" · ")}</span> : null}
                    </div>
                    {movieWithDetails.platform ? <div className="mt-1 text-neutral-300 capitalize">{movieWithDetails.platform}</div> : null}
                    {movieWithDetails.nominated_by ? (
                      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
                        Added by {movieWithDetails.nominated_by}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950"
                    onClick={() => onSwipe("dislike", movieWithDetails)}
                  >
                    {dislikeLabel}
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200"
                    onClick={() => onSwipe("like", movieWithDetails)}
                  >
                    {likeLabel}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {infoMovie || loadingInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            {loadingInfo ? (
              <div className="py-16 text-center text-neutral-400">Loading {infoType} info...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold leading-tight">{infoMovie.title}</h3>
                    {infoMovie.year || infoMovie.released ? (
                      <div className="mt-1 text-sm text-neutral-400">{displayYear(infoMovie.released || infoMovie.year)}</div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInfoMovie(null)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-neutral-300 transition hover:bg-white hover:text-black"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {infoMovie.tmdbRating ? <DetailPill>TMDB ★ {Number(infoMovie.tmdbRating).toFixed(1)}</DetailPill> : null}
                  {infoMovie.rawgRating ? <DetailPill>RAWG ★ {Number(infoMovie.rawgRating).toFixed(1)}</DetailPill> : null}
                  {infoMovie.metacritic ? <DetailPill>Metacritic {infoMovie.metacritic}</DetailPill> : null}
                  {infoMovie.runtime ? <DetailPill>{infoMovie.runtime} min</DetailPill> : null}
                  {infoMovie.numberOfSeasons ? <DetailPill>{infoMovie.numberOfSeasons} season{infoMovie.numberOfSeasons === 1 ? "" : "s"}</DetailPill> : null}
                  {infoMovie.numberOfEpisodes ? <DetailPill>{infoMovie.numberOfEpisodes} episode{infoMovie.numberOfEpisodes === 1 ? "" : "s"}</DetailPill> : null}
                  {infoMovie.status ? <DetailPill>{infoMovie.status}</DetailPill> : null}
                  {infoMovie.playtime ? <DetailPill>{infoMovie.playtime}h avg playtime</DetailPill> : null}
                  {infoMovie.esrbRating ? <DetailPill>{infoMovie.esrbRating}</DetailPill> : null}
                </div>

                {infoMovie.genres?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Genres</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {infoMovie.genres.map((genre) => <DetailPill key={genre}>{genre}</DetailPill>)}
                    </div>
                  </div>
                ) : null}

                {infoMovie.platforms?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Platforms</div>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{infoMovie.platforms.join(", ")}</p>
                  </div>
                ) : null}

                {infoMovie.screenshots?.length ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {infoMovie.screenshots.map((shot) => (
                      <img key={shot} src={shot} alt={`${infoMovie.title} screenshot`} className="h-24 w-full rounded-2xl object-cover" />
                    ))}
                  </div>
                ) : null}

                <p className="mt-5 text-sm leading-7 text-neutral-300">
                  {infoMovie.description || infoMovie.overview || `No ${infoType} description available.`}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {infoMovie.website ? <a href={infoMovie.website} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Official website</a> : null}
                  {infoMovie.rawgUrl ? <a href={infoMovie.rawgUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Open on RAWG</a> : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
