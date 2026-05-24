function normalizeUrl(url) {
  return String(url || "").trim()
}

function safeUrl(url) {
  try {
    return new URL(normalizeUrl(url))
  } catch {
    return null
  }
}

export function getYoutubeVideoId(url) {
  const parsed = safeUrl(url)
  if (!parsed) return null

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
}

export function getYoutubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

function getPlatform(parsed) {
  const host = parsed.hostname.replace(/^www\./, "")

  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube"
  if (host.endsWith("tiktok.com")) return "tiktok"
  if (host.endsWith("instagram.com")) return "instagram"

  return "link"
}

function getFallbackPoster(platform) {
  if (platform === "tiktok") return `${import.meta.env.BASE_URL}assets/tiktok-placeholder.svg`
  if (platform === "instagram") return `${import.meta.env.BASE_URL}assets/instagram-placeholder.svg`
  return ""
}

export function makeVideoFromLink({ url, title, channel = "" }) {
  const cleanUrl = normalizeUrl(url)
  const parsed = safeUrl(cleanUrl)
  if (!parsed) return null

  const platform = getPlatform(parsed)
  const youtubeId = getYoutubeVideoId(cleanUrl)
  const id = youtubeId || `${platform}:${cleanUrl}`
  const poster = youtubeId ? getYoutubeThumbnail(youtubeId) : getFallbackPoster(platform)

  return {
    id,
    video_id: youtubeId || cleanUrl,
    title: String(title || "").trim() || `${platform[0].toUpperCase()}${platform.slice(1)} video`,
    channel: String(channel || "").trim(),
    url: cleanUrl,
    poster,
    platform,
  }
}
