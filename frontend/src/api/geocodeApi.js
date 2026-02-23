import axios from 'axios'

let proximityPromise = null

function getProximity() {
  if (proximityPromise) {
    return proximityPromise
  }

  proximityPromise = new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position?.coords?.longitude
        const lat = position?.coords?.latitude
        if (typeof lng === 'number' && typeof lat === 'number') {
          resolve(`${lng},${lat}`)
          return
        }
        resolve(null)
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 600000,
      },
    )
  })

  return proximityPromise
}

// ── Mapbox Search JS (v1) ─────────────────────────────────────────────────────
// Better POI coverage than the legacy geocoding v5 endpoint.
// Docs: https://docs.mapbox.com/api/search/search-box/
const SEARCH_BOX_URL = 'https://api.mapbox.com/search/searchbox/v1/suggest'
const RETRIEVE_URL   = 'https://api.mapbox.com/search/searchbox/v1/retrieve'

// A session token must be stable for the lifetime of a search session (suggest
// → retrieve). We generate one per page load; a UUID would be ideal but this
// is sufficient for most use-cases.
const SESSION_TOKEN = `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * Fetch a full coordinate pair for a Search Box suggestion that only carries a
 * mapbox_id (POIs from suggest don't include coordinates directly).
 */
async function retrieveCoordinates(mapboxId, signal) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const response = await axios.get(`${RETRIEVE_URL}/${encodeURIComponent(mapboxId)}`, {
    params: { access_token: token, session_token: SESSION_TOKEN },
    signal,
  })
  const feature = response?.data?.features?.[0]
  return {
    lng: feature?.geometry?.coordinates?.[0] ?? null,
    lat: feature?.geometry?.coordinates?.[1] ?? null,
  }
}

/**
 * Normalize a Search Box suggestion into the same shape the rest of the app
 * expects: { label, lng, lat, place_type }
 *
 * Coordinates may require a follow-up /retrieve call for POIs — we resolve
 * them all in parallel so the caller sees no difference.
 */
async function normalizeSuggestions(suggestions, signal) {
  return Promise.all(
    suggestions.map(async (s) => {
      // Full address text
      const label = [s.name, s.place_formatted].filter(Boolean).join(', ')

      // Some suggestion types carry coordinates directly; POIs need a retrieve.
      let lng = s.geometry?.coordinates?.[0] ?? null
      let lat = s.geometry?.coordinates?.[1] ?? null

      if ((lng === null || lat === null) && s.mapbox_id) {
        try {
          const coords = await retrieveCoordinates(s.mapbox_id, signal)
          lng = coords.lng
          lat = coords.lat
        } catch {
          // leave as null — caller can still display the label
        }
      }

      return {
        label,
        lng,
        lat,
        place_type: s.feature_type || s.poi_category?.[0] || null,
      }
    }),
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchPlaces(query, signal, options = {}) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const trimmed = query.trim()

  if (!token || trimmed.length < 3) return []

  const proximity = await getProximity()

  const params = {
    q: trimmed,
    access_token: token,
    session_token: SESSION_TOKEN,
    limit: 10,
    language: options.language || 'en',
    // Request all useful types including POI
    types: 'poi,address,place,locality,neighborhood,postcode',
  }

  if (proximity) {
    params.proximity = proximity
  }

  const response = await axios.get(SEARCH_BOX_URL, { params, signal })
  const suggestions = response?.data?.suggestions ?? []

  if (suggestions.length === 0) return []

  return normalizeSuggestions(suggestions, signal)
}

export async function reverseGeocode(lng, lat, signal) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) {
    throw new Error('Missing VITE_MAPBOX_TOKEN')
  }

  // Reverse geocode still uses the stable v5 endpoint (Search Box doesn't offer reverse)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`

  const response = await axios.get(url, {
    params: {
      limit: 1,
      types: 'address,place,locality',
      access_token: token,
    },
    signal,
  })

  const feature = response?.data?.features?.[0]
  const label = feature?.place_name || `${lat}, ${lng}`

  return { label, lng, lat }
}