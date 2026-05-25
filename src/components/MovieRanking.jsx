import { useEffect, useState } from "react"
import { getMovieRanking, getMyVotes, supabase } from "../lib/supabaseClient"

export default function MovieRanking({ lobbyId = "global", refreshKey = 0 }) {
  const [movies, setMovies] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [showAll, setShowAll] = useState(false)

  async function load() {
    const ranking = await getMovieRanking(lobbyId)
    const votes = await getMyVotes(lobbyId)
    const map = {}
    votes.forEach((vote) => { map[vote.movie_id] = vote.vote })
    setMovies(ranking)
  }

  useEffect(() => { load() }, [lobbyId, refreshKey])
  useEffect(() => { if (!supabase) return; const channel = supabase.channel("live-votes").on("postgres_changes", { event: "*", schema: "public", table: "votes" }, load).subscribe(); return () => supabase.removeChannel(channel) }, [lobbyId])

  const visibleMovies = showAll ? movies : movies.slice(0, 3)

  return (
    <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Group pick</p><h2 className="mt-1 text-2xl font-bold">Next movies</h2></div>
        <div className="text-sm text-neutral-500">Top 3 first</div>
      </div>
      {movies.length === 0 ? <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">No votes yet. Swipe a movie to start the ranking.</div> : <div className="space-y-3">{visibleMovies.map((movie, index) => <div key={movie.movieId} className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-neutral-950">{index + 1}</div>{movie.poster ? <img src={movie.poster} alt={movie.title} className="h-16 w-11 rounded-lg object-cover" /> : null}<div className="min-w-0 flex-1"><h3 className="truncate font-bold">{movie.title}</h3><div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-400"><span>{movie.likes} yes</span><span>•</span><span>{movie.dislikes} skip</span><span>•</span><span>Score {movie.score}</span>{myVotes[movie.movieId] ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-white">You: {myVotes[movie.movieId] === "like" ? "yes" : "skip"}</span> : null}</div></div></div>)}{movies.length > 3 ? <button type="button" onClick={() => setShowAll((current) => !current)} className="w-full rounded-2xl border border-white/10 px-4 py-3 font-semibold text-neutral-200 hover:bg-white hover:text-neutral-950">{showAll ? "Show top 3 ↑" : `Show all ${movies.length} movies ↓`}</button> : null}</div>}
    </section>
  )
}
