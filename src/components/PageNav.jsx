import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { getSavedHandle, saveSharedHandle } from "../lib/handle"

export default function PageNav({ active = "home" }) {
  const [handle, setHandle] = useState("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    const saved = getSavedHandle()
    setHandle(saved)
    setDraft(saved)
  }, [])

  function saveHandle() {
    const saved = saveSharedHandle(draft)
    setHandle(saved)
    setEditing(false)
  }

  const linkClass = (name) =>
    `rounded-full px-3 py-2 text-sm transition sm:px-4 ${
      active === name
        ? "bg-white font-semibold text-neutral-950"
        : "text-neutral-300 hover:bg-white/10 hover:text-white"
    }`

  return (
    <>
      <header className="mb-5 rounded-full border border-white/10 bg-neutral-950/95 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:px-4">
        <div className="flex items-center gap-3">
          <nav className="grid flex-1 grid-cols-3 gap-1 rounded-full bg-white/[0.04] p-1 text-center text-xs sm:text-sm">
            <Link to="/" className={linkClass("home")}>Home</Link>
            <Link to="/movies" className={linkClass("movies")}>Movies</Link>
            <Link to="/videos" className={linkClass("videos")}>Videos</Link>
          </nav>

          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Account"
            className="flex h-11 min-w-[54px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
          >
            {handle || "+"}
          </button>
        </div>
      </header>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Account</div>
                <h2 className="mt-1 text-2xl font-bold">
                  {handle ? "Your handle" : "Create handle"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-2xl text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm text-neutral-400">
              Your handle is used everywhere across movies and videos.
            </p>

            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Choose a handle"
              className="mt-5 w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none"
            />

            <button
              type="button"
              onClick={saveHandle}
              className="mt-4 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-black"
            >
              {handle ? "Save changes" : "Create account"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
