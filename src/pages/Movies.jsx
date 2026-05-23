import { useEffect, useState, useRef } from "react"
import { Link } from "react-router-dom"
import SwipeDeck from "../components/SwipeDeck"
import { searchMovies, getExternalIds, fetchImdbRating } from "../lib/tmdb"
import { voteMovie, setRating, markWatched, getWatched, addNomination, getNominations, markWatchedWithRating, deleteWatched } from "../lib/supabaseClient"

const FALLBACK = [
  { id: 1, title: "The Room", year: 2003, poster: "https://image.tmdb.org/t/p/w500/9BgcTVk5KZV9g0u6Q4Q0V6g9Z9Q.jpg" },
  { id: 2, title: "Sharknado", year: 2013, poster: "https://image.tmdb.org/t/p/w500/8W4t7k9Q6VQz0cQ0fQ0Q0Q0Q0Q.jpg" },
]

export default function Movies() {
  const [movies, setMovies] = useState([])
  const [queue, setQueue] = useState([])
  const [viewed, setViewed] = useState([])
  const apiKey = import.meta.env.VITE_TMDB_KEY

  // start with empty queue — movies come from lobby nominations
  useEffect(() => {
    setMovies([])
    setQueue([])
  }, [])

  // no lobby — start empty and let users add movies from search

  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const omdbKey = import.meta.env.VITE_OMDB_KEY
  const [watched, setWatched] = useState([])
  const [actionMessage, setActionMessage] = useState(null)
  const deckRef = useRef(null)

  const loadGlobalNominations = async () => {
    try {
      const res = await getNominations('global')
      if (res?.data) {
        const list = res.data.map((n) => ({
          id: n.movie_id || n.id,
          title: n.title,
          year: '',
          poster: n.poster,
        }))
        setMovies(list)
        setQueue(list.slice())
      }
    } catch (e) {
      // ignore
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query) return
    const apiKey = import.meta.env.VITE_TMDB_KEY
    const res = await searchMovies(apiKey, query)
    setResults(res)
  }
  const addMovieToQueue = async (movie) => {
    const apiKey = import.meta.env.VITE_TMDB_KEY
    let imdbRating = null
    try {
      const ext = await getExternalIds(apiKey, movie.id)
      if (ext && ext.imdb_id && omdbKey) {
        imdbRating = await fetchImdbRating(omdbKey, ext.imdb_id)
      }
    } catch (e) {}

    const enhanced = { ...movie, imdbRating }
    setQueue((q) => [...q, enhanced])
  }

  const handleAddLocal = (movie) => {
    // persist the nomination to Supabase (best-effort)
    addNomination(movie).then((res) => {
      if (res?.error) {
        setActionMessage({ type: 'error', text: `Saved locally, but DB error: ${String(res.error)}` })
      } else {
        setActionMessage({ type: 'success', text: `Added "${movie.title}" to queue and saved` })
        // refresh queue from server so movie shows up after reload
        loadGlobalNominations()
        // scroll to swipe deck so user sees the card
        setTimeout(() => deckRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
      }
      setTimeout(() => setActionMessage(null), 2500)
    }).catch(() => {
      setActionMessage({ type: 'success', text: `Added "${movie.title}" to queue` })
      setTimeout(() => setActionMessage(null), 2500)
    })

    addMovieToQueue(movie)
  }

  const loadWatched = async () => {
    const res = await getWatched()
    if (res?.data) setWatched(res.data)
  }

  useEffect(() => {
    loadWatched()
    loadGlobalNominations()
  }, [])

  const handleSwipe = async (dir, movie) => {
    const vote = dir === "right" ? "like" : "dislike"
    setViewed((s) => [{ movie, vote, rating: 0 }, ...s])

    // try to persist vote to Supabase (no-op if not configured)
    try {
      await voteMovie(movie, vote)
    } catch (e) {
      // ignore
    }

    setQueue((q) => q.filter((m) => m.id !== movie.id))
  }

  const handleRating = async (movieId, rating) => {
    setViewed((s) => s.map((v) => (v.movie.id === movieId ? { ...v, rating } : v)))
    try {
      await setRating(movieId, rating)
    } catch (e) {}
  }

  return (
    <div className="min-h-screen p-6 text-white bg-neutral-950">
      <div className="mb-4 text-sm text-neutral-300">
        <Link to="/" className="hover:text-white mr-4">Home</Link>
        <Link to="/movies" className="hover:text-white">Movies</Link>
      </div>

      <h1 className="text-3xl mb-6">🎬 Thursday Movie Vote</h1>

      <div className="mb-4">
        {!apiKey && (
          <div className="bg-yellow-500 text-black p-2 rounded mb-3">
            TMDB API key missing — add `VITE_TMDB_KEY` to your .env and restart the dev server.
          </div>
        )}
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            className="flex-1 p-2 rounded bg-neutral-800"
            id="movie-search"
            name="movie"
            aria-label="Search movies by title"
            placeholder="Search movies by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="bg-blue-600 px-4 rounded">Search</button>
        </form>

        {actionMessage ? (
          <div className={`mb-3 p-2 rounded ${actionMessage.type === 'error' ? 'bg-red-600' : 'bg-green-700'}`}>{actionMessage.text}</div>
        ) : null}

        {results.length > 0 && (
          <div className="mb-4 space-y-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-neutral-800 p-2 rounded">
                {r.poster ? <img src={r.poster} className="w-16 rounded" alt="" /> : null}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <strong>{r.title}</strong>
                    <span className="text-sm text-neutral-400">TMDB: {r.tmdbRating ?? '—'}</span>
                  </div>
                  <div className="text-sm text-neutral-400">{r.year}</div>
                </div>
                <button
                  type="button"
                  className="bg-green-600 px-3 py-1 rounded"
                  title="Add to local swipe queue"
                  onClick={() => handleAddLocal(r)}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="bg-indigo-600 px-3 py-1 rounded ml-2"
                  title="Mark as watched"
                  onClick={async () => {
                    try {
                      // ask user for a quick rating (optional)
                      const ans = window.prompt('Rate this movie 0-10 (optional)', '8')
                      const rating = ans === null || ans === '' ? null : Number(ans)
                      if (rating !== null && Number.isNaN(rating)) {
                        setActionMessage({ type: 'error', text: 'Invalid rating' })
                        setTimeout(() => setActionMessage(null), 2000)
                        return
                      }
                      await markWatchedWithRating(r, 'local', rating)
                      setActionMessage({ type: 'success', text: `Marked "${r.title}" as watched` })
                      loadWatched()
                      setTimeout(() => setActionMessage(null), 2500)
                    } catch (e) {
                      setActionMessage({ type: 'error', text: `Error marking watched` })
                      setTimeout(() => setActionMessage(null), 2500)
                    }
                  }}
                >
                  Watched
                </button>
              </div>
            ))}
          </div>
        )}

        <div ref={deckRef}>
          <SwipeDeck movies={queue} onSwipe={handleSwipe} />
        </div>
      </div>

      <section>
        <h2 className="text-xl mb-3">Viewed / Votes</h2>
        {viewed.length === 0 ? (
          <p className="text-neutral-400">No movies viewed yet.</p>
        ) : (
          <div className="space-y-4">
            {viewed.map((v) => (
              <div key={v.movie.id} className="bg-neutral-800 p-3 rounded-lg">
                <div className="flex gap-4 items-center">
                  {v.movie.poster ? (
                    <img src={v.movie.poster} alt="" className="w-16 rounded" />
                  ) : null}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <strong>{v.movie.title}</strong>
                      <span className="text-sm text-neutral-400">{v.vote}</span>
                    </div>

                    <div className="mt-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={v.rating}
                        onChange={(e) => handleRating(v.movie.id, Number(e.target.value))}
                      />
                      <div className="text-sm">Rating: {v.rating}</div>
                      <div className="mt-2">
                        <button
                          className="bg-indigo-600 px-3 py-1 rounded mt-2"
                          onClick={async () => {
                            try {
                              await markWatchedWithRating(v.movie, 'local', v.rating)
                              setActionMessage({ type: 'success', text: `Marked "${v.movie.title}" as watched` })
                              loadWatched()
                              setTimeout(() => setActionMessage(null), 2500)
                            } catch (e) {
                              setActionMessage({ type: 'error', text: 'Error marking watched' })
                              setTimeout(() => setActionMessage(null), 2500)
                            }
                          }}
                        >
                          Mark Watched
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl mb-3">Watched</h2>
        {watched.length === 0 ? (
          <p className="text-neutral-400">No watched movies yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {watched.map((w) => (
              <div key={w.id} className="bg-neutral-800 p-3 rounded-lg flex gap-3 items-start">
                {w.poster ? <img src={w.poster} alt="" className="w-20 rounded" /> : null}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <strong>{w.title}</strong>
                    <div className="text-sm text-neutral-400">{w.watched_at ? new Date(w.watched_at).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="mt-2">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={w.rating ?? 0}
                      onChange={async (e) => {
                        const val = Number(e.target.value)
                        try {
                          await setRating(w.movie_id, val)
                          setActionMessage({ type: 'success', text: `Saved rating ${val}` })
                          loadWatched()
                          setTimeout(() => setActionMessage(null), 2000)
                        } catch (err) {
                          setActionMessage({ type: 'error', text: 'Error saving rating' })
                          setTimeout(() => setActionMessage(null), 2000)
                        }
                      }}
                    />
                    <div className="text-sm">Rating: {w.rating ?? 0}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {w.watched_by === 'local' && (
                    <button
                      className="text-sm text-red-400 bg-neutral-900/30 px-2 py-1 rounded"
                      onClick={async () => {
                        if (!confirm('Delete this watched entry?')) return
                        try {
                          await deleteWatched(w.id)
                          setActionMessage({ type: 'success', text: 'Deleted' })
                          loadWatched()
                          setTimeout(() => setActionMessage(null), 1500)
                        } catch (e) {
                          setActionMessage({ type: 'error', text: 'Delete failed' })
                          setTimeout(() => setActionMessage(null), 1500)
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                  <div className="text-xs text-neutral-400">{w.ratingCount ?? 0} ratings</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
