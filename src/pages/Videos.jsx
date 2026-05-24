import { useMemo, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import PageNav from "../components/PageNav"
import { makeVideoFromLink } from "../lib/youtube"

export default function Videos() {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [queue, setQueue] = useState([])
  const [classics, setClassics] = useState([])

  const topVideos = useMemo(() => queue.slice(0, 20), [queue])

  function buildVideo() {
    const video = makeVideoFromLink({ url, title })
    if (!video) {
      window.alert("Paste a valid YouTube, TikTok, or Instagram link")
      return null
    }
    return video
  }

  function resetInputs() {
    setUrl("")
    setTitle("")
  }

  function addToVoting() {
    const video = buildVideo()
    if (!video) return
    setQueue((current) => [video, ...current])
    resetInputs()
  }

  function addToClassics() {
    const video = buildVideo()
    if (!video) return
    setClassics((current) => current.some((item) => item.id === video.id) ? current : [video, ...current])
    resetInputs()
  }

  function handleSwipe(vote, video) {
    setQueue((current) => current.filter((item) => item.id !== video.id))
    if (vote === "like") {
      setClassics((current) => current.some((item) => item.id === video.id) ? current : [video, ...current])
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageNav title="Funny Videos" active="videos" />

        <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Classic internet lore</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Funny video swipe night</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">Paste YouTube, TikTok, or Instagram links. Add them to voting or instantly save them as all-time classics.</p>

          <div className="mt-5 space-y-3">
            <input className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none" placeholder="Paste YouTube / TikTok / Instagram link" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none" placeholder="Funny title" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={addToVoting} className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">Add to voting</button>
              <button type="button" onClick={addToClassics} className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-neutral-950">Save as classic</button>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <SwipeDeck movies={topVideos} onSwipe={handleSwipe} itemLabel="videos" emptyLabel="No videos left to vote on" />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Hall of fame</p>
              <h2 className="mt-1 text-3xl font-semibold">Classic funny videos</h2>
            </div>
            <div className="max-w-xs text-sm text-neutral-500 sm:text-right">Videos the group wants to remember forever</div>
          </div>

          {classics.length === 0 ? <p className="text-neutral-400">No classics yet.</p> : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {classics.map((video) => (
                <a key={video.id} href={video.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70 transition hover:border-white/30">
                  {video.poster ? <img src={video.poster} alt={video.title} className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center bg-neutral-900 text-neutral-500 uppercase tracking-[0.3em]">{video.platform}</div>}
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{video.platform}</div>
                    <div className="mt-2 text-lg font-semibold leading-tight">{video.title}</div>
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
