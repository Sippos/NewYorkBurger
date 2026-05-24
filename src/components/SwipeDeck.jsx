import { useRef, useState } from "react"

export default function SwipeDeck({ movies = [], onSwipe = () => {} }) {
  const [drag, setDrag] = useState(null)
  const pointer = useRef({ x: 0, y: 0 })

  const topMovie = movies[0]

  const handlePointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e
    pointer.current = { x: p.clientX, y: p.clientY }
    setDrag({ dx: 0, dy: 0 })
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
      onSwipe("right", movie)
    }

    if (drag.dx < -threshold) {
      onSwipe("left", movie)
    }

    setDrag(null)
  }

  if (movies.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center text-neutral-400">
        No movies in the swipe pool yet. Search and add a movie first.
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-3 text-center text-sm text-neutral-400">
        Swipe right for “want to watch”, left for “skip”.
      </div>

      <div className="relative h-[520px]">
        {movies.map((movie, index) => {
          const isTop = movie.id === topMovie.id

          const style =
            isTop && drag
              ? {
                  transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${
                    drag.dx / 20
                  }deg)`,
                  transition: "transform 0s",
                }
              : {
                  transform: `scale(${1 - index * 0.03}) translateY(${
                    index * 10
                  }px)`,
                  transition: "transform 300ms ease",
                }

          return (
            <div
              key={movie.id}
              className={`absolute left-0 right-0 mx-auto w-[320px] bg-neutral-800 rounded-2xl shadow-xl p-4 text-center ${
                isTop ? "cursor-grab" : "pointer-events-none"
              }`}
              style={{ ...style, zIndex: movies.length - index }}
              onMouseDown={isTop ? handlePointerDown : undefined}
              onTouchStart={isTop ? handlePointerDown : undefined}
              onMouseMove={isTop ? handlePointerMove : undefined}
              onTouchMove={isTop ? handlePointerMove : undefined}
              onMouseUp={isTop ? () => handlePointerUp(movie) : undefined}
              onTouchEnd={isTop ? () => handlePointerUp(movie) : undefined}
            >
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full rounded-lg mb-3"
                />
              ) : null}

              <h3 className="text-xl font-bold">{movie.title}</h3>

              {movie.year ? (
                <p className="text-sm text-neutral-400">{movie.year}</p>
              ) : null}

              {movie.nominated_by ? (
                <p className="text-xs text-neutral-500 mt-1">
                  Added by {movie.nominated_by}
                </p>
              ) : null}

              {isTop ? (
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    type="button"
                    className="bg-red-600 px-4 py-2 rounded-lg"
                    onClick={() => onSwipe("left", movie)}
                  >
                    👎 Skip
                  </button>

                  <button
                    type="button"
                    className="bg-green-600 px-4 py-2 rounded-lg"
                    onClick={() => onSwipe("right", movie)}
                  >
                    👍 Want to watch
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}