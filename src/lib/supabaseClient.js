import { createClient } from '@supabase/supabase-js'
import { getUserId } from "./utils/userId"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

function handle(res) {
  if (!res) return { error: 'no-response' }
  if (res.error) return { error: res.error }
  return { data: res.data }
}


export async function voteMovie(movie, vote) {
  const voter = getUserId()

  return supabase
    .from("votes")
    .upsert([
      {
        movie_id: movie.id,
        title: movie.title,
        poster: movie.poster,
        vote,
        voter,
        created_at: new Date().toISOString()
      }
    ])
}
  const res = await supabase.from('votes').insert([payload])
  return handle(res)


export async function setRating(movieId, rating, rater = 'local') {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = { movie_id: movieId, rating, rater }
  const res = await supabase.from('ratings').upsert(payload, { onConflict: ['movie_id', 'rater'] })
  return handle(res)
}

export async function createLobby(lobbyId) {
  if (!supabase) return { error: 'Supabase not configured' }
  // no-op server-side; lobby is logical
  return { ok: true }
}

export async function nominateMovie(lobbyId, movie, nominatedBy) {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    lobby_id: lobbyId,
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    nominated_by: nominatedBy,
  }
  const res = await supabase.from('nominations').insert([payload])
  return handle(res)
}

// Add a nomination without a specific lobby (local/global queue)
export async function addNomination(movie, nominatedBy = 'local') {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    lobby_id: 'global',
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    nominated_by: nominatedBy,
  }
  const res = await supabase.from('nominations').insert([payload])
  return handle(res)
}

export async function getNominations(lobbyId) {
  if (!supabase) return { error: 'Supabase not configured' }
  const res = await supabase.from('nominations').select('*').eq('lobby_id', lobbyId).order('created_at', { ascending: false })
  return handle(res)
}

export async function recordVote(lobbyId, movieId, voter, vote) {
  if (!supabase) return { error: 'Supabase not configured' }
  const res = await supabase.from('votes').insert([{ lobby_id: lobbyId, movie_id: movieId, voter, vote }])
  return handle(res)
}

export async function markWatched(movie, watchedBy) {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    watched_by: watchedBy,
  }
  const res = await supabase.from('watched').insert([payload])
  // do not fail if ratings table upsert fails — best-effort
  return handle(res)
}

// mark watched and optionally store rating in `ratings` table
export async function markWatchedWithRating(movie, watchedBy, rating = null) {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    watched_by: watchedBy,
  }
  const res = await supabase.from('watched').insert([payload])
    if (rating !== null && rating !== undefined) {
      try {
        await supabase.from('ratings').upsert({ movie_id: movie.id, rating, rater: watchedBy || 'local' }, { onConflict: ['movie_id', 'rater'] })
      } catch (e) {
        // ignore rating upsert errors
      }
    }
  return handle(res)
}

export async function getWatched(rater = 'local') {
  if (!supabase) return { error: 'Supabase not configured' }
  const res = await supabase.from('watched').select('*').order('watched_at', { ascending: false })
  if (res?.error) return handle(res)
  const items = res.data || []
  const movieIds = items.map((i) => i.movie_id).filter(Boolean)
  if (movieIds.length === 0) return { data: items }

  // fetch all ratings for these movies so we can compute aggregates
  const r = await supabase.from('ratings').select('movie_id,rating,rater').in('movie_id', movieIds)
  const ratings = (r?.data) || []
  const agg = {}
  const userRatings = {}
  ratings.forEach((row) => {
    const id = row.movie_id
    if (!agg[id]) agg[id] = { sum: 0, count: 0 }
    agg[id].sum += Number(row.rating) || 0
    agg[id].count += 1
    if (row.rater === rater) userRatings[id] = Number(row.rating)
  })

  const merged = items.map((it) => ({
    ...it,
    avgRating: agg[it.movie_id] ? Math.round((agg[it.movie_id].sum / agg[it.movie_id].count) * 10) / 10 : 0,
    ratingCount: agg[it.movie_id] ? agg[it.movie_id].count : 0,
    // per-user rating (for slider) defaults to user's rating or 0
    rating: userRatings[it.movie_id] ?? 0,
  }))
  return { data: merged }

}

  export async function deleteWatched(id) {
    if (!supabase) return { error: 'Supabase not configured' }
    const numericId = Number(id)
    const res = await supabase.from('watched').delete().eq('id', numericId)
    return handle(res)
}

  export async function deleteWatchedByMovieId(movieId) {
    if (!supabase) return { error: 'Supabase not configured' }
    const numeric = Number(movieId)
    const res = await supabase.from('watched').delete().eq('movie_id', numeric)
    return handle(res)
  }

  export async function getRatingsForMovieIds(movieIds = []) {
    if (!supabase) return { error: 'Supabase not configured' }
    if (!movieIds || movieIds.length === 0) return { data: [] }
    const r = await supabase.from('ratings').select('movie_id,rating').in('movie_id', movieIds)
    if (r?.error) return handle(r)
    // aggregate
    const agg = {}
    (r.data || []).forEach((row) => {
      const id = row.movie_id
      if (!agg[id]) agg[id] = { sum: 0, count: 0 }
      agg[id].sum += Number(row.rating) || 0
      agg[id].count += 1
    })
    const result = Object.entries(agg).map(([movie_id, v]) => ({ movie_id: Number(movie_id), avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }))
    return { data: result }
  }

  export async function getMovieRanking() {
  const { data, error } = await supabase
    .from("votes")
    .select("*")

  if (error) throw error

  const grouped = {}

  for (const row of data) {
    if (!grouped[row.movie_id]) {
      grouped[row.movie_id] = {
        movieId: row.movie_id,
        title: row.title,
        poster: row.poster,
        likes: 0,
        dislikes: 0
      }
    }

    if (row.vote === "like") {
      grouped[row.movie_id].likes++
    } else {
      grouped[row.movie_id].dislikes++
    }
  }

  return Object.values(grouped)
    .map(movie => ({
      ...movie,
      score: movie.likes - movie.dislikes
    }))
    .sort((a, b) => b.score - a.score)
}

export async function getMyVotes() {
  const voter = getUserId()

  const { data, error } = await supabase
    .from("votes")
    .select("*")
    .eq("voter", voter)

  if (error) throw error

  return data
}

export default supabase
