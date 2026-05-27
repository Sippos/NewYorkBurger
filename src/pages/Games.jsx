import { useEffect, useRef, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import GameRanking from "../components/GameRanking"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { getGameDetails, searchGames } from "../lib/rawg"
import { addGameNomination, getGameNominations, getMyGameVotes, getPlayedGames, markGamePlayedWithRating, setGameRating, voteGame } from "../lib/supabaseClient"

const LOBBY_ID = "global"
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function DetailPill({ children }) {
  if (!children) return null
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300">{children}</span>
}

export default function Games() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [played, setPlayed] = useState([])
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0)
  const [actionMessage, setActionMessage] = useState(null)
  const [infoGame, setInfoGame] = useState(null)
  const [loadingInfoGame, setLoadingInfoGame] = useState(false)

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_RAWG_API_KEY
  const activeHandle = getSavedHandle()
  const hasResults = results.length > 0
  const canUseApp = Boolean(activeHandle)

  async function loadNominations() {
    if (!activeHandle) return
    try {
      const nominationsRes = await getGameNominations(LOBBY_ID)
      if (nominationsRes?.error) {
        setActionMessage({ type: "error", text: "Could not load game nominations." })
        return
      }
      const allGames = (nominationsRes?.data || []).map((game) => ({
        id: game.game_id,
        title: game.title,
        poster: game.poster,
        nominated_by: game.nominated_by,
      }))
      const myVotes = await getMyGameVotes(LOBBY_ID, activeHandle)
      const votedIds = new Set(myVotes.map((vote) => vote.game_id))
      setQueue(allGames.filter((game) => !votedIds.has(game.id)))
    } catch {
      setActionMessage({ type: "error", text: "Could not load your previous game votes." })
    }
  }

  async function loadPlayed() {
    if (!activeHandle) return
    const res = await getPlayedGames(activeHandle)
    if (!res?.data) return

    const playedGames = res.data
    setPlayed(playedGames)

    if (!apiKey) return

    const enriched = await Promise.all(
      playedGames.map(async (game) => {
        const gameId = game.game_id || game.id
        const details = await getGameDetails(apiKey, gameId)
        if (!details) return game
        return {
          ...game,
          ...details,
          id: game.id,
          game_id: game.game_id,
          avgRating: game.avgRating,
          rating: game.rating,
          ratingCount: game.ratingCount,
        }
      })
    )

    setPlayed(enriched)
  }

  function clearSearch() {
    setQuery("")
    setResults([])
    setTimeout(() => deckRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  useEffect(() => {
    loadNominations()
    loadPlayed()
  }, [activeHandle])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    if (!canUseApp) {
      setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." })
      return
    }
    setResults(await searchGames(apiKey, query))
  }

  async function handleAddGame(game) {
    if (!canUseApp) {
      setActionMessage({ type: "error", text: "Create a profile with the Profile button in the navbar first." })
      return
    }
    const res = await addGameNomination(game, activeHandle, LOBBY_ID)
    if (res?.error) setActionMessage({ type: "error", text: `Could not add game: ${String(res.error.message || res.error)}` })
    else {
      setActionMessage({ type: "success", text: `"${game.title}" added to the game pile.` })
      await loadNominations()
      clearSearch()
    }
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function handleSwipe(vote, game) {
    if (!canUseApp) return
    const res = await voteGame(game, vote, LOBBY_ID, activeHandle)
    if (res?.error) {
      setActionMessage({ type: "error", text: "Vote could not be saved." })
      return
    }
    setQueue((current) => current.filter((item) => item.id !== game.id))
    setRankingRefreshKey((current) => current + 1)
    setActionMessage({ type: "success", text: vote === "like" ? `You voted to play "${game.title}".` : `You passed on "${game.title}".` })
    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(gameId, rating) {
    if (!canUseApp) return
    await setGameRating(gameId, rating, activeHandle)
    await loadPlayed()
  }

  async function handleMarkPlayed(game) {
    if (!canUseApp) return
    await markGamePlayedWithRating(game, activeHandle, null)
    await loadPlayed()
    setActionMessage({ type: "success", text: `"${game.title}" moved to played.` })
    setTimeout(() => setActionMessage(null), 2500)
  }

  async function openPlayedGameInfo(game) {
    setLoadingInfoGame(true)
    const gameId = game.game_id || game.id
    const details = await getGameDetails(apiKey, gameId)
    setInfoGame({ ...game, ...(details || {}) })
    setLoadingInfoGame(false)
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav active="games" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Game night</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Pick what to play</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">Search games, add them to the pile, and use the info button to check genres, platforms, screenshots, ratings, and descriptions before voting.</p>
          {!canUseApp ? <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create a profile with the Profile button in the navbar before voting or adding games.</p> : null}

          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none transition focus:border-white/30" placeholder="Search a game..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {hasResults ? <button type="button" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950" onClick={clearSearch}>Back</button> : null}
              <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:px-5">Search</button>
            </div>
          </form>
        </section>

        {!apiKey ? <div className="mb-4 rounded-2xl bg-yellow-500 p-3 text-black">RAWG API key missing. Add VITE_RAWG_API_KEY to GitHub Actions secrets.</div> : null}
        {actionMessage ? <div className={`mb-4 rounded-2xl p-3 ${actionMessage.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{actionMessage.text}</div> : null}

        {hasResults ? (
          <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Add games</h2>
              <button className="text-sm text-neutral-400 hover:text-white" onClick={clearSearch}>Back to swipe deck</button>
            </div>
            <div className="space-y-2">
              {results.map((game) => (
                <div key={game.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-3">
                  {game.poster ? <img src={game.poster} className="h-20 w-14 rounded-xl object-cover" alt="" /> : null}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{game.title}</strong>
                    <div className="text-sm text-neutral-400">{game.year || "Unknown year"}</div>
                    {game.genres?.length ? <div className="mt-1 line-clamp-1 text-xs text-neutral-500">{game.genres.join(" · ")}</div> : null}
                    {game.platforms?.length ? <div className="mt-1 line-clamp-1 text-xs text-neutral-500">{game.platforms.join(", ")}</div> : null}
                  </div>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:bg-white hover:text-neutral-950" onClick={() => handleAddGame(game)}>Add</button>
                  <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white hover:text-neutral-950" onClick={() => handleMarkPlayed(game)}>Played</button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {canUseApp ? (
          <>
            <section ref={deckRef} className="mb-8">
              <SwipeDeck
                movies={queue}
                onSwipe={handleSwipe}
                itemLabel="games"
                emptyLabel="No games left to vote on"
                likeLabel="Play"
                dislikeLabel="Pass"
                infoType="game"
                loadDetails={(game) => getGameDetails(apiKey, game.id)}
              />
            </section>
            <GameRanking lobbyId={LOBBY_ID} refreshKey={rankingRefreshKey} voterName={activeHandle} />
          </>
        ) : null}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">After playing</p>
              <h2 className="mt-1 text-2xl font-semibold">Played ranking</h2>
            </div>
            <div className="text-sm text-neutral-500">Sorted by average rating</div>
          </div>

          {played.length === 0 ? <p className="text-neutral-400">No played games yet.</p> : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {played.map((game) => (
                <div key={game.id} className="rounded-3xl border border-white/10 bg-neutral-950/70 p-3">
                  <div className="flex gap-3">
                    {game.poster ? <img src={game.poster} alt="" className="h-28 w-20 shrink-0 rounded-2xl object-cover" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="line-clamp-2 text-lg leading-tight">{game.title}</strong>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950">{game.avgRating === null ? "No rating" : `${game.avgRating}/10`}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{game.ratingCount || 0} rating{game.ratingCount === 1 ? "" : "s"}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {game.rawgRating ? <DetailPill>RAWG ★ {Number(game.rawgRating).toFixed(1)}</DetailPill> : null}
                        {game.released || game.year ? <DetailPill>{game.released || game.year}</DetailPill> : null}
                        {game.playtime ? <DetailPill>{game.playtime}h avg</DetailPill> : null}
                      </div>
                      {game.genres?.length ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{game.genres.join(" · ")}</div> : null}
                      <button type="button" onClick={() => openPlayedGameInfo(game)} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Info</button>
                      <div className="mt-3 grid grid-cols-5 gap-1.5">
                        {RATINGS.map((rating) => (
                          <button key={rating} type="button" className={`rounded-xl border px-0 py-2 text-sm font-semibold transition ${Number(game.rating) === rating ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30"}`} onClick={() => handleRating(game.game_id, rating)}>{rating}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {infoGame || loadingInfoGame ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            {loadingInfoGame ? (
              <div className="py-16 text-center text-neutral-400">Loading game info...</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold leading-tight">{infoGame.title}</h3>
                    {infoGame.released || infoGame.year ? <div className="mt-1 text-sm text-neutral-400">{infoGame.released || infoGame.year}</div> : null}
                  </div>
                  <button type="button" onClick={() => setInfoGame(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-neutral-300 transition hover:bg-white hover:text-black">×</button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {infoGame.rawgRating ? <DetailPill>RAWG ★ {Number(infoGame.rawgRating).toFixed(1)}</DetailPill> : null}
                  {infoGame.metacritic ? <DetailPill>Metacritic {infoGame.metacritic}</DetailPill> : null}
                  {infoGame.playtime ? <DetailPill>{infoGame.playtime}h avg playtime</DetailPill> : null}
                  {infoGame.esrbRating ? <DetailPill>{infoGame.esrbRating}</DetailPill> : null}
                  {infoGame.avgRating === null || infoGame.avgRating === undefined ? null : <DetailPill>Group ★ {infoGame.avgRating}/10</DetailPill>}
                </div>

                {infoGame.genres?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Genres</div>
                    <div className="mt-2 flex flex-wrap gap-2">{infoGame.genres.map((genre) => <DetailPill key={genre}>{genre}</DetailPill>)}</div>
                  </div>
                ) : null}

                {infoGame.platforms?.length ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Platforms</div>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{infoGame.platforms.join(", ")}</p>
                  </div>
                ) : null}

                {infoGame.screenshots?.length ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {infoGame.screenshots.map((shot) => <img key={shot} src={shot} alt={`${infoGame.title} screenshot`} className="h-24 w-full rounded-2xl object-cover" />)}
                  </div>
                ) : null}

                <p className="mt-5 text-sm leading-7 text-neutral-300">{infoGame.description || "No game description available."}</p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {infoGame.website ? <a href={infoGame.website} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Official website</a> : null}
                  {infoGame.rawgUrl ? <a href={infoGame.rawgUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Open on RAWG</a> : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
