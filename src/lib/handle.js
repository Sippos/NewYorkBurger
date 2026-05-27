export const HANDLE_STORAGE_KEY = "nyb_handle"

export function cleanHandle(value) {
  return String(value || "").trim().toLowerCase()
}

export function getSavedHandle() {
  const saved = cleanHandle(localStorage.getItem(HANDLE_STORAGE_KEY) || localStorage.getItem("video_uploader") || localStorage.getItem("rater") || "")

  if (saved) {
    localStorage.setItem(HANDLE_STORAGE_KEY, saved)
    localStorage.setItem("video_uploader", saved)
    localStorage.setItem("rater", saved)
  }

  return saved
}

export function saveSharedHandle(value) {
  const clean = cleanHandle(value)
  if (!clean) return ""

  localStorage.setItem(HANDLE_STORAGE_KEY, clean)
  localStorage.setItem("video_uploader", clean)
  localStorage.setItem("rater", clean)

  return clean
}
