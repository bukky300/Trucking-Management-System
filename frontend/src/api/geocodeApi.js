import axios from 'axios'

export async function searchPlaces(query, signal) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const trimmed = query.trim()

  if (!token || trimmed.length < 3) {
    return []
  }

  const encodedQuery = encodeURIComponent(trimmed)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`

  const response = await axios.get(url, {
    params: {
      autocomplete: true,
      limit: 5,
      types: 'address,place,locality',
      access_token: token,
    },
    signal,
  })

  const features = response?.data?.features ?? []
  return features.map((feature) => ({
    label: feature.place_name,
    lng: feature.center?.[0] ?? null,
    lat: feature.center?.[1] ?? null,
  }))
}

export async function reverseGeocode(lng, lat, signal) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) {
    throw new Error('Missing VITE_MAPBOX_TOKEN')
  }

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
