import { useRef, useState } from "react"

export default function SwipeDeck({ movies = [], onSwipe = () => {} }) {
  const [drag, setDrag] = useState(null)
  const pointer = useRef({ x: 0, y: 0 })

  const topMovie = movies[0]
  const dragX = drag?.dx || 0
  const watchOpacity = Math.min(Math.max(dragX / 110, 0), 1)
  const passOpacity = Math.min(Math.max(-dragX / 110, 0), 1)

  const handlePointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e

    pointer.current = {
      x: p.clientX,
      y: p.clientY,
    }

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

    if (drag.dx > threshold) onSwipe("like", movie)
    if (drag.dx < -threshold) onSwipe("dislike", movie)

    setDrag(null)
  }

  if (movies.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center shadow-2xl shadow-black/20">
        <h3 className="text-xl font-semibold text-white">No movies left to vote on</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Add more movies to the pile or check the ranking below.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Swipe deck</p>
        <h2 className="mt-2 text-3xl font-semibold">Your movie pile</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Drag the top card left to pass or right to watch.
        </p>
      </div>

      <div className="relative h-[620px]">
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
                  transform: `scale(${1 - index * 0.035}) translateY(${index * 14}px)`,
                  transition: "transform 250ms ease",
                }

          return (
            <div
              key={movie.id}
              className={`absolute left-0 right-0 mx-auto w-[350px] select-none overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 shadow-2xl shadow-black/40 ${
                isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
              }`}
              style={{ ...style, zIndex: movies.length - index }}
              onMouseDown={isTop ? handlePointerDown : undefined}
              onMouseMove={isTop ? handlePointerMove : undefined}
              onMouseUp={isTop ? () => handlePointerUp(movie) : undefined}
              onMouseLeave={isTop ? () => handlePointerUp(movie) : undefined}
              onTouchStart={isTop ? handlePointerDown : undefined}
              onTouchMove={isTop ? handlePointerMove : undefined}
              onTouchEnd={isTop ? () => handlePointerUp(movie) : undefined}
            >
              <div className="relative h-[440px] bg-neutral-900">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    draggable="false"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-800" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {isTop ? (
                  <>
                    <div
                      className="absolute left-6 top-8 -rotate-12 rounded-2xl border-4 border-rose-300 px-5 py-2 text-3xl font-black uppercase tracking-wide text-rose-300"
                      style={{ opacity: passOpacity }}
                    >
                      Pass
                    </div>
                    <div
                      className="absolute right-6 top-8 rotate-12 rounded-2xl border-4 border-emerald-300 px-5 py-2 text-3xl font-black uppercase tracking-wide text-emerald-300"
                      style={{ opacity: watchOpacity }}
                    >
                      Watch
                    </div>
                  </>
                ) : null}

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-3xl font-bold leading-tight">{movie.title}</h3>
                  {movie.year ? <div className="mt-1 text-neutral-300">{movie.year}</div> : null}
                  {movie.nominated_by ? (
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
                      Added by {movie.nominated_by}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4">
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950"
                  onClick={() => onSwipe("dislike", movie)}
                >
                  Pass
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  onClick={() => onSwipe("like", movie)}
                >
                  Watch
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
