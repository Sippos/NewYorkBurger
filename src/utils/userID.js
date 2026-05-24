export function getUserId() {
  let id = localStorage.getItem("movie_user_id")

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("movie_user_id", id)
  }

  return id
}