import { useRef, useState } from "react"

export default function SwipeDeck({ movies = [], onSwipe = () => {} }) {
  const [drag, setDrag] = useState(null)
  const pointer = useRef({ x: 0, y: 0 })

  const topMovie = movies[0]

  const handlePointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e

    pointer.current = {
      x: p.clientX,
      y: p.clientY,
    }

    setDrag({
      dx: 0,
      dy: 0,
    })
  }

  const handlePointerMove = (e) => {
    if (!drag) return

    const p = e.touches ? e.touches[0] : e

    setDrag({
      dx: p.clientX - pointer.current.x,
      dy: p.clientY - pointer.current.y,
    })
  }

  const handlePointerUp = (movie) => {
    if (!drag) return

    const threshold = 120

    if (drag.dx > threshold) {
      onSwipe("like", movie)
    } else if (drag.dx < -threshold) {
      onSwipe("dislike", movie)
    }

    setDrag(null)
  }

  if (movies.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-400">
        <div className="text-4xl mb-3">🍿</div>

        <h3 className="text-xl mb-2">No movies left to vote on</h3>

        <p className="text-sm text-neutral-500">
          Search and add movies above to start the group voting.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Group Watch Voting</h2>

        <div className="flex justify-center gap-6 text-sm text-neutral-400">
          <div>👈 Swipe left = Skip</div>
          <div>👉 Swipe right = Want to watch</div>
        </div>
      </div>

      <div className="relative h-[560px]">
        {movies.map((movie, index) => {
          const isTop = movie.id === topMovie.id

          const rotation = drag ? drag.dx / 18 : 0

          const style =
            isTop && drag
              ? {
                  transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${rotation}deg)`,
                  transition: "transform 0s",
                }
              : {
                  transform: `scale(${1 - index * 0.03}) translateY(${
                    index * 12
                  }px)`,
                  transition: "transform 250ms ease",
                }

          return (
            <div
              key={movie.id}
              className={`absolute left-0 right-0 mx-auto w-[340px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl ${
                isTop ? "cursor-grab" : "pointer-events-none"
              }`}
              style={{
                ...style,
                zIndex: movies.length - index,
              }}
              onMouseDown={isTop ? handlePointerDown : undefined}
              onMouseMove={isTop ? handlePointerMove : undefined}
              onMouseUp={isTop ? () => handlePointerUp(movie) : undefined}
              onMouseLeave={isTop ? () => handlePointerUp(movie) : undefined}
              onTouchStart={isTop ? handlePointerDown : undefined}
              onTouchMove={isTop ? handlePointerMove : undefined}
              onTouchEnd={isTop ? () => handlePointerUp(movie) : undefined}
            >
              <div className="relative">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-[420px] object-cover"
                  />
                ) : (
                  <div className="w-full h-[420px] bg-neutral-800" />
                )}

                {isTop && drag?.dx > 40 ? (
                  <div className="absolute top-8 right-6 rotate-12 border-4 border-green-400 text-green-400 font-bold text-3xl px-4 py-2 rounded-xl bg-black/30">
                    WANT TO WATCH
                  </div>
                ) : null}

                {isTop && drag?.dx < -40 ? (
                  <div className="absolute top-8 left-6 -rotate-12 border-4 border-red-400 text-red-400 font-bold text-3xl px-4 py-2 rounded-xl bg-black/30">
                    SKIP
                  </div>
                ) : null}
              </div>

              <div className="p-5">
                <h3 className="text-2xl font-bold">{movie.title}</h3>

                {movie.year ? (
                  <div className="text-neutral-400 mt-1">
                    {movie.year}
                  </div>
                ) : null}

                {movie.nominated_by ? (
                  <div className="text-xs text-neutral-500 mt-2">
                    Added by {movie.nominated_by}
                  </div>
                ) : null}

                <div className="flex gap-3 mt-5">
                  <button
                    className="flex-1 bg-red-600 hover:bg-red-500 transition rounded-xl py-3 font-semibold"
                    onClick={() => onSwipe("dislike", movie)}
                  >
                    👎 Skip
                  </button>

                  <button
                    className="flex-1 bg-green-600 hover:bg-green-500 transition rounded-xl py-3 font-semibold"
                    onClick={() => onSwipe("like", movie)}
                  >
                    👍 Want to Watch
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}