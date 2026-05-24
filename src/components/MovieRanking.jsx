import { useEffect, useState } from "react"
import {
  getMovieRanking,
  getMyVotes,
  supabase,
} from "../lib/supabaseClient"

export default function MovieRanking({ lobbyId = "global", refreshKey = 0 }) {
  const [movies, setMovies] = useState([])
  const [myVotes, setMyVotes] = useState({})

  async function load() {
    const ranking = await getMovieRanking(lobbyId)
    const votes = await getMyVotes(lobbyId)

    const map = {}

    votes.forEach((vote) => {
      map[vote.movie_id] = vote.vote
    })

    setMovies(ranking)
    setMyVotes(map)
  }

  useEffect(() => {
    load()
  }, [lobbyId, refreshKey])

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel("live-votes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
        },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lobbyId])

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold">Group Ranking</h2>

        <div className="text-sm text-neutral-400">
          Most wanted movies by the group
        </div>
      </div>

      {movies.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-400">
          No votes yet. Swipe a movie to start the ranking.
        </div>
      ) : (
        <div className="space-y-3">
          {movies.map((movie, index) => (
            <div
              key={movie.movieId}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex gap-4 items-center"
            >
              <div className="text-2xl font-bold text-neutral-500 w-10">
                #{index + 1}
              </div>

              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-16 rounded-lg"
                />
              ) : null}

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{movie.title}</h3>

                  {myVotes[movie.movieId] === "like" ? (
                    <span className="text-xs bg-green-700 px-2 py-1 rounded-full">
                      You voted YES
                    </span>
                  ) : null}

                  {myVotes[movie.movieId] === "dislike" ? (
                    <span className="text-xs bg-red-700 px-2 py-1 rounded-full">
                      You voted NO
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-4 mt-2 text-sm">
                  <div className="text-green-400">
                    {movie.likes} want to watch
                  </div>

                  <div className="text-red-400">
                    {movie.dislikes} skip
                  </div>

                  <div className="text-neutral-400">
                    Score {movie.score}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}