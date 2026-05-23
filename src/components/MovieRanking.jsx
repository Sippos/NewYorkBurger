import { useEffect, useState } from "react"
import { getMovieRanking, getMyVotes } from "../supabaseClient"

export default function MovieRanking() {
  const [movies, setMovies] = useState([])
  const [myVotes, setMyVotes] = useState({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const ranking = await getMovieRanking()
    const votes = await getMyVotes()

    const voteMap = {}

    votes.forEach(v => {
      voteMap[v.movie_id] = v.vote
    })

    setMovies(ranking)
    setMyVotes(voteMap)
  }

  return (
    <div className="ranking">
      <h2>🏆 Movie Ranking</h2>

      {movies.map((movie, index) => (
        <div
          key={movie.movieId}
          className="ranking-item"
        >
          <img
            src={movie.poster}
            alt={movie.title}
            width={80}
          />

          <div>
            <h3>
              #{index + 1} {movie.title}
            </h3>

            <p>
              👍 {movie.likes}
              {"  "}
              👎 {movie.dislikes}
            </p>

            <p>
              Score: {movie.score}
            </p>

            {myVotes[movie.movieId] && (
              <p>
                Your vote:
                {" "}
                {myVotes[movie.movieId] === "like"
                  ? "👍"
                  : "👎"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

useEffect(() => {
  load()

  const channel = supabase
    .channel("votes")

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "votes"
      },
      () => load()
    )

    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])