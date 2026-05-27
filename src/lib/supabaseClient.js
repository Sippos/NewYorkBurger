import { createClient } from "@supabase/supabase-js"
import { getUserId } from "../utils/userID"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

function handle(res) {
  if (!res) return { error: "no-response" }
  if (res.error) return { error: res.error }
  return { data: res.data }
}

export function getVoterId(handleName = "") {
  const handle = String(handleName || "").trim().toLowerCase()
  return handle || getUserId()
}

function getDisplayHandle(handleName = "") {
  return String(handleName || "").trim()
}

export async function addNomination(movie, nominatedBy = "local", lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }

  const payload = {
    lobby_id: lobbyId,
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    nominated_by: getDisplayHandle(nominatedBy) || "local",
  }

  const res = await supabase.from("nominations").upsert(payload, { onConflict: "lobby_id,movie_id" }).select()
  return handle(res)
}

export const nominateMovie = addNomination

export async function getNominations(lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("nominations").select("*").eq("lobby_id", lobbyId).order("created_at", { ascending: false }))
}

export async function voteMovie(movie, vote, lobbyId = "global", voterName = "") {
  if (!supabase) return { error: "Supabase not configured" }
  const voter = getVoterId(voterName)
  const payload = { lobby_id: lobbyId, movie_id: movie.id, title: movie.title, poster: movie.poster, voter, vote }
  return handle(await supabase.from("votes").upsert(payload, { onConflict: "lobby_id,movie_id,voter" }).select())
}

export async function resetVotesForVoter(lobbyId = "global", voterName = "") {
  if (!supabase) return { error: "Supabase not configured" }
  const voter = getVoterId(voterName)
  return handle(await supabase.from("votes").delete().eq("lobby_id", lobbyId).eq("voter", voter))
}

export async function resetAllVotes(lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("votes").delete().eq("lobby_id", lobbyId))
}

export async function getMovieRanking(lobbyId = "global") {
  if (!supabase) return []
  const { data, error } = await supabase.from("votes").select("*").eq("lobby_id", lobbyId)
  if (error) throw error
  const grouped = {}
  for (const row of data || []) {
    if (!grouped[row.movie_id]) grouped[row.movie_id] = { movieId: row.movie_id, title: row.title, poster: row.poster, likes: 0, dislikes: 0 }
    if (row.vote === "like") grouped[row.movie_id].likes += 1
    if (row.vote === "dislike") grouped[row.movie_id].dislikes += 1
  }
  return Object.values(grouped).map((movie) => ({ ...movie, totalVotes: movie.likes + movie.dislikes, score: movie.likes - movie.dislikes })).sort((a, b) => b.likes - a.likes || b.score - a.score)
}

export async function getMyVotes(lobbyId = "global", voterName = "") {
  if (!supabase) return []
  const voter = getVoterId(voterName)
  const { data, error } = await supabase.from("votes").select("*").eq("lobby_id", lobbyId).eq("voter", voter)
  if (error) throw error
  return data || []
}

export async function setRating(movieId, rating, rater = "local") {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("ratings").upsert({ movie_id: movieId, rating, rater: getVoterId(rater) }, { onConflict: "movie_id,rater" }).select())
}

export async function markWatchedWithRating(movie, watchedBy, rating = null) {
  if (!supabase) return { error: "Supabase not configured" }
  const res = await supabase.from("watched").upsert({ movie_id: movie.id, title: movie.title, poster: movie.poster, watched_by: getDisplayHandle(watchedBy) || "local" }, { onConflict: "movie_id" }).select()
  if (rating !== null && rating !== undefined) await setRating(movie.id, rating, watchedBy)
  return handle(res)
}

export async function getWatched(rater = "local") {
  if (!supabase) return { error: "Supabase not configured" }
  const res = await supabase.from("watched").select("*").order("watched_at", { ascending: false })
  if (res.error) return handle(res)
  const watched = res.data || []
  const movieIds = watched.map((w) => w.movie_id).filter(Boolean)
  if (movieIds.length === 0) return { data: watched }
  const ratingsRes = await supabase.from("ratings").select("*").in("movie_id", movieIds)
  const ratings = ratingsRes.data || []
  const raterKey = getVoterId(rater)
  return { data: watched.map((movie) => {
    const movieRatings = ratings.filter((r) => r.movie_id === movie.movie_id)
    const myRating = movieRatings.find((r) => getVoterId(r.rater) === raterKey)
    const avgRating = movieRatings.length > 0 ? Math.round((movieRatings.reduce((sum, r) => sum + Number(r.rating), 0) / movieRatings.length) * 10) / 10 : null
    return { ...movie, rating: myRating?.rating ?? null, avgRating, ratingCount: movieRatings.length }
  }).sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.ratingCount - a.ratingCount) }
}

export async function deleteWatchedByMovieId(movieId) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("watched").delete().eq("movie_id", Number(movieId)))
}

export async function addGameNomination(game, nominatedBy = "local", lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }
  const payload = { lobby_id: lobbyId, game_id: game.id, title: game.title, poster: game.poster, nominated_by: getDisplayHandle(nominatedBy) || "local" }
  return handle(await supabase.from("game_nominations").upsert(payload, { onConflict: "lobby_id,game_id" }).select())
}

export async function getGameNominations(lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("game_nominations").select("*").eq("lobby_id", lobbyId).order("created_at", { ascending: false }))
}

export async function voteGame(game, vote, lobbyId = "global", voterName = "") {
  if (!supabase) return { error: "Supabase not configured" }
  const voter = getVoterId(voterName)
  const payload = { lobby_id: lobbyId, game_id: game.id, title: game.title, poster: game.poster, voter, vote }
  return handle(await supabase.from("game_votes").upsert(payload, { onConflict: "lobby_id,game_id,voter" }).select())
}

export async function getGameRanking(lobbyId = "global") {
  if (!supabase) return []
  const { data, error } = await supabase.from("game_votes").select("*").eq("lobby_id", lobbyId)
  if (error) throw error
  const grouped = {}
  for (const row of data || []) {
    if (!grouped[row.game_id]) grouped[row.game_id] = { gameId: row.game_id, title: row.title, poster: row.poster, likes: 0, dislikes: 0 }
    if (row.vote === "like") grouped[row.game_id].likes += 1
    if (row.vote === "dislike") grouped[row.game_id].dislikes += 1
  }
  return Object.values(grouped).map((game) => ({ ...game, totalVotes: game.likes + game.dislikes, score: game.likes - game.dislikes })).sort((a, b) => b.likes - a.likes || b.score - a.score)
}

export async function getMyGameVotes(lobbyId = "global", voterName = "") {
  if (!supabase) return []
  const voter = getVoterId(voterName)
  const { data, error } = await supabase.from("game_votes").select("*").eq("lobby_id", lobbyId).eq("voter", voter)
  if (error) throw error
  return data || []
}

export async function setGameRating(gameId, rating, rater = "local") {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("game_ratings").upsert({ game_id: gameId, rating, rater: getVoterId(rater) }, { onConflict: "game_id,rater" }).select())
}

export async function markGamePlayedWithRating(game, playedBy, rating = null) {
  if (!supabase) return { error: "Supabase not configured" }
  const res = await supabase.from("game_watched").upsert({ game_id: game.id, title: game.title, poster: game.poster, watched_by: getDisplayHandle(playedBy) || "local" }, { onConflict: "game_id" }).select()
  if (rating !== null && rating !== undefined) await setGameRating(game.id, rating, playedBy)
  return handle(res)
}

export async function getPlayedGames(rater = "local") {
  if (!supabase) return { error: "Supabase not configured" }
  const res = await supabase.from("game_watched").select("*").order("watched_at", { ascending: false })
  if (res.error) return handle(res)
  const played = res.data || []
  const gameIds = played.map((game) => game.game_id).filter(Boolean)
  if (gameIds.length === 0) return { data: played }
  const ratingsRes = await supabase.from("game_ratings").select("*").in("game_id", gameIds)
  const ratings = ratingsRes.data || []
  const raterKey = getVoterId(rater)
  return { data: played.map((game) => {
    const gameRatings = ratings.filter((r) => r.game_id === game.game_id)
    const myRating = gameRatings.find((r) => getVoterId(r.rater) === raterKey)
    const avgRating = gameRatings.length > 0 ? Math.round((gameRatings.reduce((sum, r) => sum + Number(r.rating), 0) / gameRatings.length) * 10) / 10 : null
    return { ...game, rating: myRating?.rating ?? null, avgRating, ratingCount: gameRatings.length }
  }).sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.ratingCount - a.ratingCount) }
}

export async function getVideoLinks() {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("video_links").select("*").order("created_at", { ascending: false }))
}

export async function addVideoLink(video, uploadedBy = "local", isClassic = false) {
  if (!supabase) return { error: "Supabase not configured" }
  const payload = {
    id: video.id,
    title: video.title,
    url: video.url,
    poster: video.poster || null,
    platform: video.platform || "link",
    uploaded_by: getDisplayHandle(uploadedBy) || "local",
    is_classic: isClassic,
  }
  return handle(await supabase.from("video_links").upsert(payload, { onConflict: "id" }).select())
}

export async function updateVideoLink(videoId, updates = {}) {
  if (!supabase) return { error: "Supabase not configured" }

  const allowed = ["title", "url", "poster", "platform", "is_classic"]
  const payload = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)))

  return handle(await supabase.from("video_links").update(payload).eq("id", videoId).select())
}

export async function setVideoClassic(videoId, isClassic = true) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("video_links").update({ is_classic: isClassic }).eq("id", videoId).select())
}

export async function deleteVideoLink(videoId) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("video_links").delete().eq("id", videoId))
}

function leaderboardKey(handleName) {
  const handle = String(handleName || "").trim()
  if (!handle || handle.toLowerCase() === "local") return null
  return handle.toLowerCase()
}

function chooseDisplayHandle(existingDisplay, nextDisplay) {
  const next = String(nextDisplay || "").trim()
  if (!next) return existingDisplay
  if (!existingDisplay) return next
  const existingHasUpper = /[A-Z]/.test(existingDisplay)
  const nextHasUpper = /[A-Z]/.test(next)
  if (!existingHasUpper && nextHasUpper) return next
  return existingDisplay
}

function addScore(board, handleName, source, points, reason, id) {
  const key = leaderboardKey(handleName)
  if (!key || !points) return
  const displayHandle = getDisplayHandle(handleName)

  if (!board[key]) {
    board[key] = {
      handle: displayHandle || key,
      key,
      total: 0,
      breakdown: { movies: 0, games: 0, videos: 0 },
      activity: [],
    }
  } else {
    board[key].handle = chooseDisplayHandle(board[key].handle, displayHandle)
  }

  board[key].total += points
  board[key].breakdown[source] += points
  board[key].activity.push({ id, source, points, reason })
}

function averageRating(rows, idKey, id) {
  const matches = (rows || []).filter((row) => String(row[idKey]) === String(id))
  if (matches.length === 0) return null
  return matches.reduce((sum, row) => sum + Number(row.rating || 0), 0) / matches.length
}

export async function getLeaderboard() {
  if (!supabase) return { error: "Supabase not configured" }

  const [moviesRes, watchedRes, ratingsRes, gamesRes, playedRes, gameRatingsRes, videosRes] = await Promise.all([
    supabase.from("nominations").select("*"),
    supabase.from("watched").select("*"),
    supabase.from("ratings").select("*"),
    supabase.from("game_nominations").select("*"),
    supabase.from("game_watched").select("*"),
    supabase.from("game_ratings").select("*"),
    supabase.from("video_links").select("*"),
  ])

  const firstError = [moviesRes, watchedRes, ratingsRes, gamesRes, playedRes, gameRatingsRes, videosRes].find((res) => res.error)?.error
  if (firstError) return { error: firstError }

  const board = {}
  const watchedIds = new Set((watchedRes.data || []).map((movie) => String(movie.movie_id)))
  const playedIds = new Set((playedRes.data || []).map((game) => String(game.game_id)))

  for (const movie of moviesRes.data || []) {
    const title = movie.title || "a movie"
    addScore(board, movie.nominated_by, "movies", 1, `suggested movie “${title}”`, `movie-${movie.movie_id}-nomination`)
    if (watchedIds.has(String(movie.movie_id))) addScore(board, movie.nominated_by, "movies", 5, `movie picked: “${title}”`, `movie-${movie.movie_id}-watched`)

    const avg = averageRating(ratingsRes.data, "movie_id", movie.movie_id)
    if (avg >= 8) addScore(board, movie.nominated_by, "movies", 3, `high-rated movie: “${title}”`, `movie-${movie.movie_id}-high-rating`)
  }

  for (const game of gamesRes.data || []) {
    const title = game.title || "a game"
    addScore(board, game.nominated_by, "games", 1, `suggested game “${title}”`, `game-${game.game_id}-nomination`)
    if (playedIds.has(String(game.game_id))) addScore(board, game.nominated_by, "games", 5, `game played: “${title}”`, `game-${game.game_id}-played`)

    const avg = averageRating(gameRatingsRes.data, "game_id", game.game_id)
    if (avg >= 8) addScore(board, game.nominated_by, "games", 3, `high-rated game: “${title}”`, `game-${game.game_id}-high-rating`)
  }

  for (const video of videosRes.data || []) {
    const title = video.title || "a video"
    addScore(board, video.uploaded_by, "videos", 1, `uploaded video “${title}”`, `video-${video.id}-upload`)
    if (video.is_classic) addScore(board, video.uploaded_by, "videos", 4, `classic video: “${title}”`, `video-${video.id}-classic`)
  }

  const data = Object.values(board)
    .map((person) => ({
      ...person,
      activity: person.activity.sort((a, b) => b.points - a.points),
    }))
    .sort((a, b) => b.total - a.total || a.handle.localeCompare(b.handle))

  return { data }
}

export default supabase
