export function getYoutubeVideoId(url) {
  try {
    const parsed = new URL(String(url || "").trim())
    const host = parsed.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null
    }

    if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v")
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || null
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || null
      if (parsed.pathname.startsWith("/live/")) return parsed.pathname.split("/")[2] || null
    }

    return null
  } catch {
    return null
  }
}

export function getYoutubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function makeVideoFromLink({ url, title, channel = "" }) {
  const videoId = getYoutubeVideoId(url)
  if (!videoId) return null

  return {
    id: videoId,
    video_id: videoId,
    title: String(title || "").trim() || "Funny video",
    channel: String(channel || "").trim(),
    url: String(url || "").trim(),
    poster: getYoutubeThumbnail(videoId),
  }
}
