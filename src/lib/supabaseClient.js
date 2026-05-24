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

export async function addNomination(movie, nominatedBy = "local", lobbyId = "global") {
  if (!supabase) return { error: "Supabase not configured" }

  const payload = {
    lobby_id: lobbyId,
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    nominated_by: nominatedBy,
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
  return handle(await supabase.from("ratings").upsert({ movie_id: movieId, rating, rater }, { onConflict: "movie_id,rater" }).select())
}

export async function markWatchedWithRating(movie, watchedBy, rating = null) {
  if (!supabase) return { error: "Supabase not configured" }
  const res = await supabase.from("watched").upsert({ movie_id: movie.id, title: movie.title, poster: movie.poster, watched_by: watchedBy }, { onConflict: "movie_id" }).select()
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
  return { data: watched.map((movie) => {
    const movieRatings = ratings.filter((r) => r.movie_id === movie.movie_id)
    const myRating = movieRatings.find((r) => r.rater === rater)
    const avgRating = movieRatings.length > 0 ? Math.round((movieRatings.reduce((sum, r) => sum + Number(r.rating), 0) / movieRatings.length) * 10) / 10 : null
    return { ...movie, rating: myRating?.rating ?? null, avgRating, ratingCount: movieRatings.length }
  }).sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.ratingCount - a.ratingCount) }
}

export async function deleteWatchedByMovieId(movieId) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("watched").delete().eq("movie_id", Number(movieId)))
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
    uploaded_by: uploadedBy,
    is_classic: isClassic,
  }
  return handle(await supabase.from("video_links").upsert(payload, { onConflict: "id" }).select())
}

export async function setVideoClassic(videoId, isClassic = true) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("video_links").update({ is_classic: isClassic }).eq("id", videoId).select())
}

export async function deleteVideoLink(videoId) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("video_links").delete().eq("id", videoId))
}

export default supabase