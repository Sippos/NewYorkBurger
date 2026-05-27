import { getVoterId, supabase } from "./supabaseClient"

export const COOKING_EVENT_ID = "rap-cooking-night"
export const COOKING_SLOTS = [
  "Friday 19:00",
  "Saturday 18:00",
  "Sunday 17:00",
]

function handle(res) {
  if (!res) return { error: "no-response" }
  if (res.error) return { error: res.error }
  return { data: res.data }
}

function getDisplayHandle(handleName = "") {
  return String(handleName || "").trim()
}

export async function getCookingAvailability(eventId = COOKING_EVENT_ID) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("cooking_availability").select("*").eq("event_id", eventId).order("created_at", { ascending: true }))
}

export async function saveCookingAvailability({ eventId = COOKING_EVENT_ID, handleName = "", slots = [], allergies = "", note = "" }) {
  if (!supabase) return { error: "Supabase not configured" }

  const participantKey = getVoterId(handleName)
  const displayName = getDisplayHandle(handleName) || participantKey

  const deleteRes = await supabase
    .from("cooking_availability")
    .delete()
    .eq("event_id", eventId)
    .eq("participant_key", participantKey)

  if (deleteRes.error) return handle(deleteRes)
  if (!slots.length) return { data: [] }

  const payload = slots.map((slot) => ({
    event_id: eventId,
    participant_key: participantKey,
    display_name: displayName,
    slot,
    allergies: String(allergies || "").trim() || null,
    note: String(note || "").trim() || null,
  }))

  return handle(await supabase.from("cooking_availability").insert(payload).select())
}

export async function getCookingIngredients(eventId = COOKING_EVENT_ID) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("cooking_ingredients").select("*").eq("event_id", eventId).order("created_at", { ascending: true }))
}

export async function addCookingIngredient({ eventId = COOKING_EVENT_ID, name = "", isSecret = false, addedBy = "" }) {
  if (!supabase) return { error: "Supabase not configured" }
  const cleanName = String(name || "").trim()
  if (!cleanName) return { error: "Ingredient name missing" }

  const payload = {
    event_id: eventId,
    name: cleanName,
    is_secret: Boolean(isSecret),
    is_revealed: !isSecret,
    added_by: getDisplayHandle(addedBy) || getVoterId(addedBy),
  }

  return handle(await supabase.from("cooking_ingredients").insert(payload).select())
}

export async function setCookingIngredientRevealed(ingredientId, isRevealed = true) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("cooking_ingredients").update({ is_revealed: Boolean(isRevealed) }).eq("id", ingredientId).select())
}

export async function getIngredientGuesses(eventId = COOKING_EVENT_ID) {
  if (!supabase) return { error: "Supabase not configured" }
  return handle(await supabase.from("cooking_ingredient_guesses").select("*").eq("event_id", eventId).order("created_at", { ascending: false }))
}

export async function saveIngredientGuess({ eventId = COOKING_EVENT_ID, ingredientId, guess = "", guessedBy = "" }) {
  if (!supabase) return { error: "Supabase not configured" }
  const cleanGuess = String(guess || "").trim()
  if (!ingredientId) return { error: "Pick a secret ingredient first" }
  if (!cleanGuess) return { error: "Guess missing" }

  const guessedByKey = getVoterId(guessedBy)
  const payload = {
    event_id: eventId,
    ingredient_id: ingredientId,
    guessed_by_key: guessedByKey,
    guessed_by: getDisplayHandle(guessedBy) || guessedByKey,
    guess: cleanGuess,
  }

  return handle(await supabase.from("cooking_ingredient_guesses").upsert(payload, { onConflict: "ingredient_id,guessed_by_key" }).select())
}
