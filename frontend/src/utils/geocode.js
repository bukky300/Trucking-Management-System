function parseCityState(features) {
  let city = ''
  let state = ''

  for (const feature of features || []) {
    const types = feature?.place_type || []

    if (!city && (types.includes('place') || types.includes('locality'))) {
      city = feature?.text || ''
    }

    if (!state && types.includes('region')) {
      const shortCode = String(feature?.properties?.short_code ?? '').toUpperCase()
      state = shortCode.includes('-') ? shortCode.split('-').pop() || '' : shortCode
    }
  }

  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'LOC'
}

export async function reverseGeocodeLabel(lng, lat, token, signal) {
  if (!token) {
    return 'LOC'
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  const params = new URLSearchParams({
    types: 'place,locality,region',
    access_token: token,
  })

  const response = await fetch(`${url}?${params.toString()}`, { signal })
  if (!response.ok) {
    return 'LOC'
  }

  const data = await response.json()
  return parseCityState(data?.features ?? [])
}
