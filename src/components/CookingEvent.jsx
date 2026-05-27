import { useEffect, useMemo, useState } from "react"
import { getSavedHandle } from "../lib/handle"
import {
  COOKING_EVENT_ID,
  COOKING_SLOTS,
  addCookingIngredient,
  getCookingAvailability,
  getCookingIngredients,
  getIngredientGuesses,
  saveCookingAvailability,
  saveIngredientGuess,
  setCookingIngredientRevealed,
} from "../lib/cookingEvent"
import { supabase } from "../lib/supabaseClient"

function Pill({ children }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300">{children}</span>
}

function SecretName({ ingredient, index }) {
  if (!ingredient.is_secret || ingredient.is_revealed) return ingredient.name
  return `Secret ingredient #${index + 1}`
}

export default function CookingEvent() {
  const [availability, setAvailability] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [guesses, setGuesses] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [allergies, setAllergies] = useState("")
  const [note, setNote] = useState("")
  const [ingredientName, setIngredientName] = useState("")
  const [ingredientSecret, setIngredientSecret] = useState(true)
  const [selectedIngredientId, setSelectedIngredientId] = useState("")
  const [guess, setGuess] = useState("")
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  const handle = getSavedHandle()
  const canParticipate = Boolean(handle)

  const slotStats = useMemo(() => {
    return COOKING_SLOTS.map((slot) => {
      const rows = availability.filter((row) => row.slot === slot)
      const names = [...new Set(rows.map((row) => row.display_name).filter(Boolean))]
      return { slot, count: names.length, names }
    }).sort((a, b) => b.count - a.count || COOKING_SLOTS.indexOf(a.slot) - COOKING_SLOTS.indexOf(b.slot))
  }, [availability])

  const winningSlot = slotStats[0]
  const visibleIngredients = ingredients.filter((ingredient) => !ingredient.is_secret || ingredient.is_revealed)
  const secretIngredients = ingredients.filter((ingredient) => ingredient.is_secret)
  const hiddenIngredients = ingredients.filter((ingredient) => ingredient.is_secret && !ingredient.is_revealed)
  const myGuesses = handle ? guesses.filter((item) => item.guessed_by?.toLowerCase() === handle.toLowerCase()) : []

  async function load() {
    setLoading(true)
    const [availabilityRes, ingredientsRes, guessesRes] = await Promise.all([
      getCookingAvailability(COOKING_EVENT_ID),
      getCookingIngredients(COOKING_EVENT_ID),
      getIngredientGuesses(COOKING_EVENT_ID),
    ])

    if (availabilityRes?.data) setAvailability(availabilityRes.data)
    if (ingredientsRes?.data) setIngredients(ingredientsRes.data)
    if (guessesRes?.data) setGuesses(guessesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!handle || availability.length === 0) return
    const myRows = availability.filter((row) => row.display_name?.toLowerCase() === handle.toLowerCase())
    if (!myRows.length) return
    setSelectedSlots(myRows.map((row) => row.slot))
    setAllergies(myRows.find((row) => row.allergies)?.allergies || "")
    setNote(myRows.find((row) => row.note)?.note || "")
  }, [handle, availability.length])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel("cooking-event-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cooking_availability" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cooking_ingredients" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cooking_ingredient_guesses" }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  function toggleSlot(slot) {
    setSelectedSlots((current) => current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot])
  }

  async function submitAvailability() {
    if (!canParticipate) {
      setMessage({ type: "error", text: "Create a profile with the Profile button first." })
      return
    }
    const res = await saveCookingAvailability({ eventId: COOKING_EVENT_ID, handleName: handle, slots: selectedSlots, allergies, note })
    if (res?.error) setMessage({ type: "error", text: `Could not save hunger: ${res.error?.message || res.error}` })
    else setMessage({ type: "success", text: selectedSlots.length ? "Your hunger schedule is saved." : "Your availability was cleared." })
    await load()
    setTimeout(() => setMessage(null), 2400)
  }

  async function submitIngredient() {
    if (!canParticipate) {
      setMessage({ type: "error", text: "Create a profile with the Profile button first." })
      return
    }
    const res = await addCookingIngredient({ eventId: COOKING_EVENT_ID, name: ingredientName, isSecret: ingredientSecret, addedBy: handle })
    if (res?.error) setMessage({ type: "error", text: `Could not add ingredient: ${res.error?.message || res.error}` })
    else {
      setMessage({ type: "success", text: ingredientSecret ? "Secret ingredient locked in." : "Ingredient added to the public pot." })
      setIngredientName("")
    }
    await load()
    setTimeout(() => setMessage(null), 2400)
  }

  async function submitGuess() {
    if (!canParticipate) {
      setMessage({ type: "error", text: "Create a profile with the Profile button first." })
      return
    }
    const res = await saveIngredientGuess({ eventId: COOKING_EVENT_ID, ingredientId: selectedIngredientId, guess, guessedBy: handle })
    if (res?.error) setMessage({ type: "error", text: `Could not save guess: ${res.error?.message || res.error}` })
    else {
      setMessage({ type: "success", text: "Guess submitted. May the spoon be with you." })
      setGuess("")
    }
    await load()
    setTimeout(() => setMessage(null), 2400)
  }

  async function revealIngredient(ingredientId) {
    const res = await setCookingIngredientRevealed(ingredientId, true)
    if (res?.error) setMessage({ type: "error", text: "Could not reveal ingredient." })
    else setMessage({ type: "success", text: "Secret ingredient revealed." })
    await load()
    setTimeout(() => setMessage(null), 2400)
  }

  return (
    <section className="mt-8 w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 text-left shadow-2xl shadow-black/20 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">The event is cooking</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Raps geheimes Kochduell</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            First vote when your stomach is available. Later: ingredients get tracked, secret ingredients get guessed, chaos gets documented.
          </p>
        </div>
        {winningSlot?.count ? <Pill>Current winner: {winningSlot.slot}</Pill> : <Pill>Poll open</Pill>}
      </div>

      {!canParticipate ? <p className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">Create a profile with the Profile button before voting or guessing.</p> : null}
      {message ? <div className={`mt-4 rounded-2xl p-3 text-sm ${message.type === "error" ? "bg-red-600" : "bg-emerald-700"}`}>{message.text}</div> : null}
      {loading ? <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-400">Loading kitchen gossip...</div> : null}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-neutral-950/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Phase 1</p>
              <h3 className="mt-1 text-xl font-bold">Wann kann wer?</h3>
            </div>
            <div className="text-sm text-neutral-500">{availability.length} vote row{availability.length === 1 ? "" : "s"}</div>
          </div>

          <div className="space-y-2">
            {COOKING_SLOTS.map((slot) => {
              const stat = slotStats.find((item) => item.slot === slot)
              const selected = selectedSlots.includes(slot)
              return (
                <button key={slot} type="button" onClick={() => toggleSlot(slot)} className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-white bg-white text-neutral-950" : "border-white/10 bg-white/[0.03] text-white hover:border-white/30"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{slot}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected ? "bg-neutral-950 text-white" : "bg-white text-neutral-950"}`}>{stat?.count || 0}</span>
                  </div>
                  {stat?.names?.length ? <div className={`mt-2 text-xs ${selected ? "text-neutral-700" : "text-neutral-400"}`}>{stat.names.join(" · ")}</div> : null}
                </button>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies / No-Gos" className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kommentar, z.B. bringe Hunger" className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none" />
          </div>
          <button type="button" onClick={submitAvailability} className="mt-3 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">Save my hunger</button>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-neutral-950/70 p-4">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Phase 2</p>
            <h3 className="mt-1 text-xl font-bold">Secret ingredient mode</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Add known ingredients now. Secret ones stay hidden until someone reveals them after dinner.</p>
          </div>

          <div className="flex gap-2">
            <input value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} placeholder="Ingredient" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none" />
            <button type="button" onClick={() => setIngredientSecret((current) => !current)} className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${ingredientSecret ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-100" : "border-white/10 text-neutral-300 hover:bg-white hover:text-neutral-950"}`}>{ingredientSecret ? "Secret" : "Public"}</button>
          </div>
          <button type="button" onClick={submitIngredient} className="mt-3 w-full rounded-2xl border border-white/10 px-5 py-3 font-semibold text-neutral-200 transition hover:bg-white hover:text-neutral-950">Add to pot</button>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Known</div>
              {visibleIngredients.length === 0 ? <p className="text-sm text-neutral-500">No public ingredients yet.</p> : <div className="flex flex-wrap gap-2">{visibleIngredients.map((ingredient) => <Pill key={ingredient.id}>{ingredient.name}</Pill>)}</div>}
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Suspicious</div>
              {secretIngredients.length === 0 ? <p className="text-sm text-neutral-500">No secrets locked in.</p> : <div className="space-y-2">{secretIngredients.map((ingredient, index) => <div key={ingredient.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm"><div className="font-semibold">🔒 <SecretName ingredient={ingredient} index={index} /></div>{ingredient.is_revealed ? <div className="mt-1 text-xs text-emerald-300">revealed</div> : <button type="button" onClick={() => revealIngredient(ingredient.id)} className="mt-2 text-xs font-semibold text-neutral-300 underline hover:text-white">Reveal after dinner</button>}</div>)}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-neutral-950/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">After dinner</p>
            <h3 className="mt-1 text-xl font-bold">Guess what Rap put in there</h3>
          </div>
          <Pill>{guesses.length} guess{guesses.length === 1 ? "" : "es"}</Pill>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[0.8fr_1fr_auto]">
          <select value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)} className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none">
            <option value="">Pick a secret</option>
            {hiddenIngredients.map((ingredient, index) => <option key={ingredient.id} value={ingredient.id}>Secret ingredient #{index + 1}</option>)}
            {secretIngredients.filter((ingredient) => ingredient.is_revealed).map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
          </select>
          <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess, e.g. cinnamon, MSG, betrayal" className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none" />
          <button type="button" onClick={submitGuess} className="rounded-2xl bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">Guess</button>
        </div>

        {myGuesses.length ? <div className="mt-4 flex flex-wrap gap-2">{myGuesses.map((item) => <Pill key={item.id}>Your guess: {item.guess}</Pill>)}</div> : null}
      </div>
    </section>
  )
}
