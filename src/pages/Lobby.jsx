import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { searchMovies } from '../lib/tmdb'
import { nominateMovie, getNominations } from '../lib/supabaseClient'

function makeId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function Lobby() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const [lobbyId, setLobbyId] = useState(paramId || '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [nominations, setNominations] = useState([])
  const [supabaseStatus, setSupabaseStatus] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (paramId) setLobbyId(paramId)
  }, [paramId])

  useEffect(() => {
    if (!lobbyId) return
    const load = async () => {
      const res = await getNominations(lobbyId)
      if (res?.error) {
        setSupabaseStatus({ ok: false, error: res.error })
      } else {
        setSupabaseStatus({ ok: true })
        setNominations(res.data)
      }
    }
    load()
  }, [lobbyId])

  const handleCreate = () => {
    const id = makeId(6)
    setLobbyId(id)
    navigate(`/lobby/${id}`)
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query) return
    const apiKey = import.meta.env.VITE_TMDB_KEY
    const res = await searchMovies(apiKey, query)
    setResults(res)
  }

  const handleNominate = async (movie) => {
    if (!lobbyId) return alert('Create or enter a lobby id first')
    try {
      const res = await nominateMovie(lobbyId, movie, 'anonymous')
      if (res?.error) {
        setMessage({ type: 'error', text: String(res.error) })
      } else {
        setMessage({ type: 'success', text: 'Nominated successfully' })
        const next = await getNominations(lobbyId)
        if (!next?.error) setNominations(next.data)
      }
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: String(e) })
    }
  }

  return (
    <div className="min-h-screen p-6 text-white bg-neutral-950">
      <div className="mb-4 text-sm text-neutral-300">
        <Link to="/" className="hover:text-white mr-4">Home</Link>
        <Link to="/movies" className="hover:text-white mr-4">Movies</Link>
        <Link to="/lobby" className="hover:text-white">Lobby</Link>
      </div>

      <h1 className="text-2xl mb-4">Lobby & Nominations</h1>

      {supabaseStatus ? (
        <div className={`mb-3 p-2 rounded ${supabaseStatus.ok ? 'bg-green-700' : 'bg-red-600'}`}>
          {supabaseStatus.ok ? 'Supabase: connected' : `Supabase error: ${String(supabaseStatus.error)}`}
        </div>
      ) : null}

      {message ? (
        <div className={`mb-3 p-2 rounded ${message.type === 'error' ? 'bg-red-600' : 'bg-green-700'}`}>{message.text}</div>
      ) : null}

      <div className="mb-4 flex gap-2">
        <input value={lobbyId} onChange={(e) => setLobbyId(e.target.value)} placeholder="Lobby id" className="p-2 rounded bg-neutral-800" />
        <button className="bg-blue-600 px-3 rounded" onClick={() => navigate(`/lobby/${lobbyId}`)}>Enter</button>
        <button className="bg-green-600 px-3 rounded" onClick={handleCreate}>Create</button>
      </div>

      {lobbyId && (
        <div className="mb-6">
          <div className="text-sm text-neutral-400 mb-2">Share this link with friends:</div>
          <div className="bg-neutral-800 p-2 rounded break-all">{window.location.origin + `/lobby/${lobbyId}`}</div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input className="flex-1 p-2 rounded bg-neutral-800" placeholder="Search movies to nominate" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="bg-blue-600 px-4 rounded">Search</button>
      </form>

      {results.length > 0 && (
        <div className="mb-6 space-y-2">
          {results.map((r) => (
            <div key={r.id} className="flex items-center gap-3 bg-neutral-800 p-2 rounded">
              {r.poster ? <img src={r.poster} className="w-16 rounded" alt="" /> : null}
              <div className="flex-1">
                <div className="flex justify-between">
                  <strong>{r.title}</strong>
                  <span className="text-sm text-neutral-400">TMDB: {r.tmdbRating ?? '—'}</span>
                </div>
              </div>
              <button type="button" className="bg-green-600 px-3 py-1 rounded" onClick={() => handleNominate(r)}>Nominate</button>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-xl mb-3">Nominations</h2>
        {nominations.length === 0 ? (
          <p className="text-neutral-400">No nominations yet.</p>
        ) : (
          <div className="space-y-2">
            {nominations.map((n) => (
              <div key={n.id} className="flex items-center gap-3 bg-neutral-800 p-2 rounded">
                {n.poster ? <img src={n.poster} className="w-16 rounded" alt="" /> : null}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <strong>{n.title}</strong>
                    <span className="text-sm text-neutral-400">by {n.nominated_by ?? 'anon'}</span>
                  </div>
                  <div className="text-sm text-neutral-400">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
