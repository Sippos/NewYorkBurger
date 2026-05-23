import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export async function voteMovie(movie, vote) {
  if (!supabase) return { error: 'Supabase not configured' }

  const payload = {
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    vote, // 'like' or 'dislike'
    created_at: new Date().toISOString(),
  }

  return supabase.from('votes').insert([payload])
}

export async function setRating(movieId, rating) {
  if (!supabase) return { error: 'Supabase not configured' }
  return supabase.from('ratings').upsert({ movie_id: movieId, rating })
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
  return supabase.from('nominations').insert([payload])
}

export async function getNominations(lobbyId) {
  if (!supabase) return { error: 'Supabase not configured' }
  return supabase.from('nominations').select('*').eq('lobby_id', lobbyId).order('created_at', { ascending: false })
}

export async function recordVote(lobbyId, movieId, voter, vote) {
  if (!supabase) return { error: 'Supabase not configured' }
  return supabase.from('votes').insert([{ lobby_id: lobbyId, movie_id: movieId, voter, vote }])
}

export async function markWatched(movie, watchedBy) {
  if (!supabase) return { error: 'Supabase not configured' }
  const payload = {
    movie_id: movie.id,
    title: movie.title,
    poster: movie.poster,
    watched_by: watchedBy,
  }
  return supabase.from('watched').insert([payload])
}

export async function getWatched() {
  if (!supabase) return { error: 'Supabase not configured' }
  return supabase.from('watched').select('*').order('watched_at', { ascending: false })
}

export default supabase
