import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import PageNav from "../components/PageNav"
import { getSavedHandle } from "../lib/handle"
import { getYoutubeTitle, makeVideoFromLink } from "../lib/youtube"
import { addVideoLink } from "../lib/supabaseClient"

function extractFirstUrl(...values) {
  const combined = values.filter(Boolean).join(" ")
  const match = combined.match(/https?:\/\/[^\s]+/i)
  return match ? match[0].replace(/[),.]+$/, "") : ""
}

function getShareParams(search) {
  const params = new URLSearchParams(search)
  const sharedUrl = params.get("url") || extractFirstUrl(params.get("text"), params.get("title"))

  return {
    title: params.get("title") || "",
    text: params.get("text") || "",
    url: sharedUrl || params.get("text") || "",
  }
}

export default function ShareVideo() {
  const location = useLocation()
  const navigate = useNavigate()
  const handle = getSavedHandle()
  const shareParams = useMemo(() => getShareParams(location.search), [location.search])

  const [url, setUrl] = useState(shareParams.url)
  const [title, setTitle] = useState(shareParams.title)
  const [isClassic, setIsClassic] = useState(false)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const canUpload = Boolean(handle)

  useEffect(() => {
    setUrl(shareParams.url)
    setTitle(shareParams.title)
  }, [shareParams])

  useEffect(() => {
    if (!title.trim() && url.trim()) {
      getYoutubeTitle(url).then((youtubeTitle) => {
        if (youtubeTitle) setTitle(youtubeTitle)
      })
    }
  }, [title, url])

  async function saveSharedVideo() {
    const video = makeVideoFromLink({ url, title })
    if (!video) {
      setMessage({ type: "error", text: "Paste a valid YouTube, TikTok, Instagram, or normal web link." })
      return
    }

    if (!canUpload) {
      setMessage({ type: "error", text: "Create an account with the + button in the navbar first." })
      return
    }

    setSaving(true)
    const res = await addVideoLink(video, handle, isClassic)
    setSaving(false)

    if (res?.error) {
      setMessage({ type: "error", text: `Could not save video: ${res.error?.message || res.error}` })
      return
    }

    setMessage({ type: "success", text: isClassic ? "Saved as a classic." : "Saved to the video feed." })
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-3 text-white sm:px-4 md:px-6">
      <div className="mx-auto max-w-3xl">
        <PageNav active="videos" />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20 md:p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Shared to New York Burger</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Save video link</h1>
          <p className="mt-3 text-neutral-400">
            Review the shared link, let YouTube title fetching fill the title when possible, then save it to the same video feed.
          </p>

          {!canUpload ? (
            <p className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">
              Create an account with the + button in the navbar before saving shared links.
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-semibold text-neutral-300" htmlFor="shared-video-url">Link</label>
            <input
              id="shared-video-url"
              className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none focus:border-white/30"
              placeholder="https://youtu.be/..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />

            <label className="block pt-2 text-sm font-semibold text-neutral-300" htmlFor="shared-video-title">Title</label>
            <input
              id="shared-video-title"
              className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none focus:border-white/30"
              placeholder="Fetched YouTube title or custom title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={isClassic}
                onChange={(event) => setIsClassic(event.target.checked)}
                className="h-4 w-4 accent-white"
              />
              Save as classic
            </label>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={saveSharedVideo}
                disabled={saving}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save to videos"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/videos")}
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white hover:text-neutral-950"
              >
                Open video feed
              </button>
            </div>
          </div>

          {message ? (
            <div className={`mt-4 rounded-2xl p-3 ${message.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>
              <p>{message.text}</p>
              {message.type === "success" ? <Link to="/videos" className="mt-2 inline-block underline">View saved videos</Link> : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
