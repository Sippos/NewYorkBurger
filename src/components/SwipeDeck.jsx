import React, { useRef, useState } from 'react'

export default function SwipeDeck({ movies = [], onSwipe = () => {}, raterName = 'local' }) {
  const [drag, setDrag] = useState(null)
  const pointer = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e
    pointer.current = { x: p.clientX, y: p.clientY }
    setDrag({ dx: 0, dy: 0 })
  }

  const handlePointerMove = (e) => {
    if (!drag) return
    const p = e.touches ? e.touches[0] : e
    const dx = p.clientX - pointer.current.x
    const dy = p.clientY - pointer.current.y
    setDrag({ dx, dy })
  }

  const handlePointerUp = (movie) => {
    if (!drag) return
    const threshold = 120
    const dir = drag.dx > threshold ? 'right' : drag.dx < -threshold ? 'left' : null
    if (dir) onSwipe(dir, movie)
    setDrag(null)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative h-[520px]">
        {movies.map((m, i) => {
          const isTop = i === 0
          const style = isTop && drag ? {
            transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 20}deg)`,
            transition: 'transform 0s',
          } : { transition: 'transform 300ms ease' }

          return (
            <div
              key={m.id}
              className={`absolute left-0 right-0 mx-auto w-[320px] bg-neutral-800 rounded-2xl shadow-xl p-4 text-center ${isTop ? 'cursor-grab' : 'pointer-events-none'}`}
              style={{ ...style, zIndex: movies.length - i }}
              onMouseDown={isTop ? handlePointerDown : undefined}
              onTouchStart={isTop ? handlePointerDown : undefined}
              onMouseMove={isTop ? handlePointerMove : undefined}
              onTouchMove={isTop ? handlePointerMove : undefined}
              onMouseUp={isTop ? () => handlePointerUp(m) : undefined}
              onTouchEnd={isTop ? () => handlePointerUp(m) : undefined}
            >
              {m.poster ? (
                <img src={m.poster} alt={m.title} className="w-full rounded-lg mb-3" />
              ) : null}
              <h3 className="text-xl font-bold">{m.title}</h3>
              <p className="text-sm text-neutral-400">{m.year}</p>
              <div className="mt-2">
                {(m.avgRating || m.imdbRating || m.tmdbRating) ? (
                  <p className="text-sm text-yellow-400">Rating: {m.avgRating ?? m.imdbRating ?? m.tmdbRating} {m.ratingCount ? `(${m.ratingCount})` : ''}</p>
                ) : (
                  <p className="text-sm text-neutral-400">No rating</p>
                )}
                {m.nominated_by ? <p className="text-xs text-neutral-500">Nominated by {m.nominated_by}</p> : null}
              </div>

              {isTop ? (
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    className="bg-green-600 px-4 py-2 rounded-lg"
                    onClick={() => onSwipe('right', m)}
                    aria-label="Mark watched"
                  >
                    Watch
                  </button>
                  <button
                    className="bg-red-600 px-4 py-2 rounded-lg"
                    onClick={() => onSwipe('left', m)}
                    aria-label="Skip"
                  >
                    Skip
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
