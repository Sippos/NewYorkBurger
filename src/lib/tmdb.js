function mapMovie(m) {
  return {
    id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.split('-')[0] : '',
    released: m.release_date || null,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
    overview: m.overview || '',
    tmdbRating: m.vote_average ?? null,
    runtime: m.runtime ?? null,
    genres: m.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
  }
}

export async function fetchPopularMovies(apiKey, page = 1) {
  if (!apiKey) {
    return []
  }

  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=${page}`

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return data.results.map(mapMovie)
}

export default fetchPopularMovies

export async function searchMovies(apiKey, query, page = 1) {
  if (!apiKey || !query) return []
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
    query
  )}&page=${page}&include_adult=false`

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return data.results.map(mapMovie)
}

export async function getMovieDetails(apiKey, movieId) {
  if (!apiKey || !movieId) return null

  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`

  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  return mapMovie(data)
}

export async function getExternalIds(apiKey, movieId) {
  if (!apiKey || !movieId) return null
  const url = `https://api.themoviedb.org/3/movie/${movieId}/external_ids?api_key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function fetchImdbRating(omdbKey, imdbId) {
  if (!omdbKey || !imdbId) return null
  const url = `https://www.omdbapi.com/?apikey=${omdbKey}&i=${encodeURIComponent(imdbId)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return data?.imdbRating ?? null
}
