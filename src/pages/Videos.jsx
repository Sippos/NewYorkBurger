import { useEffect, useMemo, useState } from "react"
import SwipeDeck from "../components/SwipeDeck"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { getYoutubeTitle, makeVideoFromLink } from "../lib/youtube"
import { addVideoLink, deleteVideoLink, getVideoLinks, setVideoClassic, supabase, updateVideoLink } from "../lib/supabaseClient"

function VideoCard({ video, onEdit, onMarkClassic }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/70">
      <div className="relative">
        <a href={video.url} target="_blank" rel="noreferrer">
          {video.poster && video.platform !== "tiktok" ? (
            <img src={video.poster} alt={video.title} className="h-52 w-full object-cover" />
          ) : (
            <div className="flex h-52 w-full items-center justify-center bg-neutral-900 text-neutral-500 uppercase tracking-[0.3em]">
              {video.platform}
            </div>
          )}
        </a>
        <button type="button" onClick={() => onEdit(video)} className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-sm backdrop-blur hover:bg-white hover:text-black">⚙</button>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500"><span>{video.platform}</span><span>•</span><span>by {video.uploaded_by}</span></div>
        <a href={video.url} target="_blank" rel="noreferrer" className="mt-2 block text-lg font-semibold leading-tight hover:underline">{video.title}</a>
        <div className="mt-3 flex flex-wrap gap-2">{video.is_classic ? <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950">Classic</span> : <button type="button" onClick={() => onMarkClassic(video)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white hover:text-neutral-950">Mark classic</button>}</div>
      </div>
    </div>
  )
}

export default function Videos() {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [editingVideo, setEditingVideo] = useState(null)
  const [videos, setVideos] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handle = getSavedHandle()
  const classics = useMemo(() => videos.filter((video) => video.is_classic), [videos])
  const votePile = useMemo(() => videos.filter((video) => !video.is_classic).slice(0, 20), [videos])
  const canUpload = Boolean(handle)

  function normalizeVideo(row) { return { ...row, id: row.id, title: row.title, poster: row.poster, platform: row.platform, url: row.url, uploaded_by: row.uploaded_by, nominated_by: row.uploaded_by } }

  async function loadVideos() {
    setLoading(true)
    const res = await getVideoLinks()
    if (res?.error) setMessage({ type: "error", text: `Could not load videos: ${res.error?.message || res.error}` })
    else setVideos((res.data || []).map(normalizeVideo))
    setLoading(false)
  }

  useEffect(() => { loadVideos() }, [])
  useEffect(() => { if (!title.trim() && url.trim()) getYoutubeTitle(url).then((youtubeTitle) => { if (youtubeTitle) setTitle(youtubeTitle) }) }, [url])
  useEffect(() => { if (!supabase) return; const channel = supabase.channel("video-links-live").on("postgres_changes", { event: "*", schema: "public", table: "video_links" }, loadVideos).subscribe(); return () => supabase.removeChannel(channel) }, [])

  function buildVideo() {
    const video = makeVideoFromLink({ url, title })
    if (!video) { setMessage({ type: "error", text: "Paste a valid YouTube, TikTok, or Instagram link." }); return null }
    if (!canUpload) { setMessage({ type: "error", text: "Create an account with the + button in the navbar first." }); return null }
    return video
  }

  async function uploadVideo(isClassic = false) {
    const video = buildVideo()
    if (!video) return
    const res = await addVideoLink(video, handle, isClassic)
    if (res?.error) { setMessage({ type: "error", text: `Could not save video: ${res.error?.message || res.error}` }); return }
    setMessage({ type: "success", text: isClassic ? "Saved as classic." : "Uploaded to the feed." })
    setUrl(""); setTitle(""); await loadVideos()
  }

  async function markClassic(video) { const res = await setVideoClassic(video.id, true); if (res?.error) { setMessage({ type: "error", text: "Could not save classic." }); return } await loadVideos() }
  async function saveVideoSettings() { if (!editingVideo) return; const res = await updateVideoLink(editingVideo.id, { title: editingVideo.title }); if (res?.error) { setMessage({ type: "error", text: "Could not update video." }); return } setEditingVideo(null); await loadVideos() }
  async function removeVideo(id) { const res = await deleteVideoLink(id); if (res?.error) { setMessage({ type: "error", text: "Could not delete video." }); return } setEditingVideo(null); await loadVideos() }
  async function handleSwipe(vote, video) { if (vote === "like") await markClassic(video) }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6"><div className="mx-auto max-w-5xl"><PageNav active="videos" />
      <section className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 sm:rounded-[1.75rem] md:p-5"><div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Shared link dump</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Upload funny links</h1><p className="mt-3 max-w-2xl text-neutral-400">Paste YouTube, TikTok, or Instagram links. Your navbar account handle is used automatically.</p>{!canUpload ? <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create an account with the + button in the navbar before uploading.</p> : null}</div>
        <div className="mt-5 space-y-3"><input className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none" placeholder="Paste YouTube / TikTok / Instagram link" value={url} onChange={(e) => setUrl(e.target.value)} /><input className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none" placeholder="Funny title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => uploadVideo(false)} className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">Upload to feed</button><button type="button" onClick={() => uploadVideo(true)} className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-neutral-950">Upload as classic</button></div></div></section>
      {message ? <div className={`mb-4 rounded-2xl p-3 ${message.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{message.text}</div> : null}{loading ? <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-neutral-400">Loading videos...</div> : null}
      <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Latest uploads</p><h2 className="mt-1 text-3xl font-semibold">Video feed</h2></div><div className="text-sm text-neutral-500">{videos.length} uploaded link{videos.length === 1 ? "" : "s"}</div></div>{videos.length === 0 ? <p className="text-neutral-400">No links uploaded yet.</p> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{videos.map((video) => <VideoCard key={video.id} video={video} onEdit={setEditingVideo} onMarkClassic={markClassic} />)}</div>}</section>
      <section className="mb-10"><SwipeDeck movies={votePile} onSwipe={handleSwipe} itemLabel="videos" emptyLabel="No non-classic videos left to vote on" /></section>
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Hall of fame</p><h2 className="mt-1 text-3xl font-semibold">Classic funny videos</h2></div><div className="max-w-xs text-sm text-neutral-500 sm:text-right">Pinned links the group wants to remember forever</div></div>{classics.length === 0 ? <p className="text-neutral-400">No classics yet.</p> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{classics.map((video) => <VideoCard key={video.id} video={video} onEdit={setEditingVideo} onMarkClassic={markClassic} />)}</div>}</section>
      {editingVideo ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/40"><div className="flex items-center justify-between"><h3 className="text-2xl font-bold">Video settings</h3><button type="button" onClick={() => setEditingVideo(null)} className="text-2xl text-neutral-400 hover:text-white">×</button></div><div className="mt-5 space-y-3"><input className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none" value={editingVideo.title} onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })} /><button type="button" onClick={saveVideoSettings} className="w-full rounded-2xl bg-white px-5 py-3 font-semibold text-black">Save changes</button><button type="button" onClick={() => removeVideo(editingVideo.id)} className="w-full rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white">Delete video</button></div></div></div> : null}
    </div></div>
  )
}
