import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import SwipeDeck from "../components/SwipeDeck"
import MovieRanking from "../components/MovieRanking"
import { searchMovies } from "../lib/tmdb"
import {
  addNomination,
  deleteWatchedByMovieId,
  getMyVotes,
  getNominations,
  getWatched,
  markWatchedWithRating,
  setRating,
  voteMovie,
} from "../lib/supabaseClient"

const LOBBY_ID = "global"

export default function Movies() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [queue, setQueue] = useState([])
  const [watched, setWatched] = useState([])
  const [actionMessage, setActionMessage] = useState(null)
  const [raterName, setRaterName] = useState(
    () => localStorage.getItem("rater") || "local"
  )

  const deckRef = useRef(null)
  const apiKey = import.meta.env.VITE_TMDB_KEY

  async function loadNominations() {
    try {
      const nominationsRes = await getNominations(LOBBY_ID)

      if (nominationsRes?.error) {
        setActionMessage({
          type: "error",
          text: "Could not load movie nominations.",
        })
        return
      }

      const allMovies = (nominationsRes?.data || []).map((n) => ({
        id: n.movie_id,
        title: n.title,
        poster: n.poster,
        nominated_by: n.nominated_by,
      }))

      const myVotes = await getMyVotes(LOBBY_ID)

      const votedIds = new Set(myVotes.map((vote) => vote.movie_id))

      setQueue(allMovies.filter((movie) => !votedIds.has(movie.id)))
    } catch {
      setActionMessage({
        type: "error",
        text: "Could not load your previous movie votes.",
      })
    }
  }

  async function loadWatched() {
    const res = await getWatched(raterName)
    if (res?.data) setWatched(res.data)
  }

  useEffect(() => {
    loadNominations()
  }, [])

  useEffect(() => {
    loadWatched()
  }, [raterName])

  async function handleSearch(e) {
    e.preventDefault()

    if (!query.trim()) return

    const movies = await searchMovies(apiKey, query)
    setResults(movies)
  }

  async function handleAddMovie(movie) {
    const res = await addNomination(movie, raterName, LOBBY_ID)

    if (res?.error) {
      setActionMessage({
        type: "error",
        text: `Could not add movie: ${String(res.error.message || res.error)}`,
      })
    } else {
      setActionMessage({
        type: "success",
        text: `"${movie.title}" added to the swipe pool.`,
      })

      await loadNominations()

      setTimeout(() => {
        deckRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 200)
    }

    setTimeout(() => setActionMessage(null), 2500)
  }

  async function handleSwipe(vote, movie) {
    const res = await voteMovie(movie, vote, LOBBY_ID)

    if (res?.error) {
      setActionMessage({
        type: "error",
        text: "Vote could not be saved.",
      })

      return
    }

    setQueue((current) => current.filter((item) => item.id !== movie.id))

    setActionMessage({
      type: "success",
      text:
        vote === "like"
          ? `You voted to watch "${movie.title}".`
          : `You skipped "${movie.title}".`,
    })

    setTimeout(() => setActionMessage(null), 2200)
  }

  async function handleRating(movieId, rating) {
    await setRating(movieId, rating, raterName)
    await loadWatched()
  }

  async function handleMarkWatched(movie) {
    const answer = window.prompt("Rate this movie 0-10 optional", "8")
    const rating = answer === null || answer === "" ? null : Number(answer)

    if (rating !== null && Number.isNaN(rating)) {
      setActionMessage({ type: "error", text: "Invalid rating." })
      setTimeout(() => setActionMessage(null), 2000)
      return
    }

    await markWatchedWithRating(movie, raterName, rating)
    await loadWatched()

    setActionMessage({
      type: "success",
      text: `Marked "${movie.title}" as watched.`,
    })

    setTimeout(() => setActionMessage(null), 2500)
  }

  return (
    <div className="min-h-screen p-6 text-white bg-neutral-950">
      <div className="mb-4 text-sm text-neutral-300">
        <Link to="/" className="hover:text-white mr-4">
          Home
        </Link>
        <Link to="/movies" className="hover:text-white">
          Movies
        </Link>
      </div>

      <h1 className="text-3xl mb-6">🎬 Movie Vote</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-neutral-400">Your name:</label>
        <input
          className="p-2 rounded bg-neutral-800"
          value={raterName}
          onChange={(e) => {
            setRaterName(e.target.value)
            localStorage.setItem("rater", e.target.value)
          }}
          placeholder="your name"
        />
      </div>

      {!apiKey ? (
        <div className="bg-yellow-500 text-black p-2 rounded mb-3">
          TMDB API key missing. Add VITE_TMDB_KEY to your .env file.
        </div>
      ) : null}

      {actionMessage ? (
        <div
          className={`mb-3 p-2 rounded ${
            actionMessage.type === "error" ? "bg-red-600" : "bg-green-700"
          }`}
        >
          {actionMessage.text}
        </div>
      ) : null}

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          className="flex-1 p-2 rounded bg-neutral-800"
          placeholder="Search movies by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="bg-blue-600 px-4 rounded">Search</button>
      </form>

      {results.length > 0 ? (
        <section className="mb-6 space-y-2">
          {results.map((movie) => (
            <div
              key={movie.id}
              className="flex items-center gap-3 bg-neutral-800 p-2 rounded"
            >
              {movie.poster ? (
                <img src={movie.poster} className="w-16 rounded" alt="" />
              ) : null}

              <div className="flex-1">
                <strong>{movie.title}</strong>
                <div className="text-sm text-neutral-400">
                  {movie.year || "Unknown year"}
                </div>
              </div>

              <button
                type="button"
                className="bg-green-600 px-3 py-1 rounded"
                onClick={() => handleAddMovie(movie)}
              >
                Add to swipe pool
              </button>

              <button
                type="button"
                className="bg-indigo-600 px-3 py-1 rounded"
                onClick={() => handleMarkWatched(movie)}
              >
                Watched
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section ref={deckRef} className="mb-8">
        <SwipeDeck movies={queue} onSwipe={handleSwipe} />
      </section>

      <MovieRanking lobbyId={LOBBY_ID} />

      <section className="mt-8">
        <h2 className="text-xl mb-3">Watched</h2>

        {watched.length === 0 ? (
          <p className="text-neutral-400">No watched movies yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {watched.map((movie) => (
              <div
                key={movie.id}
                className="bg-neutral-800 p-3 rounded-lg flex gap-3 items-start"
              >
                {movie.poster ? (
                  <img src={movie.poster} alt="" className="w-20 rounded" />
                ) : null}

                <div className="flex-1">
                  <strong>{movie.title}</strong>

                  <div className="mt-2">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={movie.rating ?? 0}
                      onChange={(e) =>
                        handleRating(movie.movie_id, Number(e.target.value))
                      }
                    />

                    <div className="text-sm">
                      Your rating: {movie.rating ?? 0}
                    </div>

                    <div className="text-xs text-neutral-400">
                      Avg: {movie.avgRating ?? 0} ({movie.ratingCount ?? 0})
                    </div>
                  </div>

                  <button
                    className="text-sm text-red-400 mt-3"
                    onClick={async () => {
                      await deleteWatchedByMovieId(movie.movie_id)
                      await loadWatched()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
