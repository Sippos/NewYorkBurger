import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

function handle(res) {
  if (!res) return { error: 'no-response' }
  if (res.error) return { error: res.error }
  return { data: res.data }
}

export async function voteMovie(movie, vote) {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    vote,
    created_at: new Date().toISOString(),
  }
  const res = await supabase.from('votes').insert([payload])
  return handle(res)
}

export async function setRating(movieId, rating) {
  if (!supabase) return { error: 'Supabase not configured' }
  const res = await supabase.from('ratings').upsert({ movie_id: movieId, rating })
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
  return handle(res)
}

export async function getWatched() {
  if (!supabase) return { error: 'Supabase not configured' }
  const res = await supabase.from('watched').select('*').order('watched_at', { ascending: false })
  return handle(res)
}

export default supabase
