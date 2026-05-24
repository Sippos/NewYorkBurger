import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import SwipeDeck from "../components/SwipeDeck"
import { makeVideoFromLink } from "../lib/youtube"

export default function Videos() {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [channel, setChannel] = useState("")
  const [queue, setQueue] = useState([])
  const [classics, setClassics] = useState([])

  const topVideos = useMemo(() => queue.slice(0, 20), [queue])

  function buildVideo() {
    const video = makeVideoFromLink({ url, title, channel })

    if (!video) {
      window.alert("Paste a valid YouTube, TikTok, or Instagram link")
      return null
    }

    return video
  }

  function resetInputs() {
    setUrl("")
    setTitle("")
    setChannel("")
  }

  function addToVoting(e) {
    e.preventDefault()

    const video = buildVideo()
    if (!video) return

    setQueue((current) => [video, ...current])
    resetInputs()
  }

  function addToClassics() {
    const video = buildVideo()
    if (!video) return

    setClassics((current) => {
      if (current.some((item) => item.id === video.id)) return current
      return [video, ...current]
    })

    resetInputs()
  }

  function handleSwipe(vote, video) {
    setQueue((current) => current.filter((item) => item.id !== video.id))

    if (vote === "like") {
      setClassics((current) => {
        if (current.some((item) => item.id === video.id)) return current
        return [video, ...current]
      })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="sticky top-3 z-30 mb-5 rounded-full border border-white/10 bg-neutral-950/80 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="text-sm font-semibold tracking-tight text-white">
              Funny Videos
            </Link>

            <nav className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 text-xs text-neutral-300 sm:text-sm">
              <Link to="/movies" className="rounded-full px-2.5 py-1.5 hover:bg-white/10 hover:text-white sm:px-3">Movies</Link>
              <Link to="/videos" className="rounded-full bg-white px-2.5 py-1.5 font-medium text-neutral-950 sm:px-3">Videos</Link>
            </nav>
          </div>
        </header>

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Classic internet lore</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Funny video swipe night
          </h1>

          <p className="mt-2 text-neutral-400">
            Paste YouTube, TikTok, or Instagram links. Add them to voting or instantly save them as all-time classics.
          </p>

          <form className="mt-5 space-y-3">
            <input
              className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none"
              placeholder="Paste YouTube / TikTok / Instagram link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none"
                placeholder="Funny title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none"
                placeholder="Channel / creator / meme source"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addToVoting}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Add to voting
              </button>

              <button
                type="button"
                onClick={addToClassics}
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-neutral-950"
              >
                Save as classic
              </button>
            </div>
          </form>
        </section>

        <section className="mb-10">
          <SwipeDeck movies={topVideos} onSwipe={handleSwipe} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Hall of fame</p>
              <h2 className="mt-1 text-2xl font-semibold">Classic funny videos</h2>
            </div>

            <div className="text-sm text-neutral-500">
              Videos the group wants to remember forever
            </div>
          </div>

          {classics.length === 0 ? (
            <p className="text-neutral-400">No classics yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {classics.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 transition hover:border-white/30"
                >
                  {video.poster ? (
                    <img src={video.poster} alt={video.title} className="h-52 w-full object-cover" />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-neutral-900 text-neutral-500 uppercase tracking-[0.3em]">
                      {video.platform}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                      <span>{video.platform}</span>
                    </div>

                    <div className="mt-2 text-lg font-semibold leading-tight">{video.title}</div>

                    {video.channel ? (
                      <div className="mt-2 text-sm text-neutral-400">{video.channel}</div>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
