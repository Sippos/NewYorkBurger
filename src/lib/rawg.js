function mapGame(game) {
  return {
    id: game.id,
    title: game.name,
    year: game.released ? String(game.released).split('-')[0] : '',
    released: game.released || null,
    poster: game.background_image || null,
    rawgRating: game.rating ?? null,
    metacritic: game.metacritic ?? null,
    platforms: game.platforms?.map((entry) => entry.platform?.name).filter(Boolean) ?? [],
    genres: game.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
    rawgUrl: game.slug ? `https://rawg.io/games/${game.slug}` : null,
  }
}

async function fetchRawg(apiKey, path) {
  if (!apiKey || !path) return null

  const url = new URL(`https://api.rawg.io/api/${path}`)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url)
  if (!res.ok) return null

  return res.json()
}

export async function searchGames(apiKey, query, page = 1) {
  if (!apiKey || !query) return []

  const url = new URL('https://api.rawg.io/api/games')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('search', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', '12')

  const res = await fetch(url)
  if (!res.ok) return []

  const data = await res.json()
  return (data.results || []).map(mapGame)
}

export async function getGameDetails(apiKey, gameId) {
  if (!apiKey || !gameId) return null

  const [details, screenshots] = await Promise.all([
    fetchRawg(apiKey, `games/${gameId}`),
    fetchRawg(apiKey, `games/${gameId}/screenshots`),
  ])

  if (!details) return null

  return {
    ...mapGame(details),
    description: details.description_raw || '',
    website: details.website || null,
    playtime: details.playtime ?? null,
    developers: details.developers?.map((entry) => entry.name).filter(Boolean) ?? [],
    publishers: details.publishers?.map((entry) => entry.name).filter(Boolean) ?? [],
    stores: details.stores?.map((entry) => entry.store?.name).filter(Boolean) ?? [],
    esrbRating: details.esrb_rating?.name || null,
    screenshots: (screenshots?.results || []).map((shot) => shot.image).filter(Boolean).slice(0, 6),
  }
}
