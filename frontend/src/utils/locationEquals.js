const EARTH_RADIUS_METERS = 6371000
const SAME_LOCATION_TOLERANCE_METERS = 50

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function normalizeLabel(label) {
  return String(label ?? '').trim().toLowerCase()
}

function hasCoordinates(location) {
  return (
    location &&
    typeof location.lng === 'number' &&
    Number.isFinite(location.lng) &&
    typeof location.lat === 'number' &&
    Number.isFinite(location.lat)
  )
}

function haversineMeters(a, b) {
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const dLat = lat2 - lat1
  const dLng = toRadians(b.lng - a.lng)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return EARTH_RADIUS_METERS * c
}

export function locationEquals(a, b) {
  if (!a || !b) {
    return false
  }

  if (hasCoordinates(a) && hasCoordinates(b)) {
    return haversineMeters(a, b) <= SAME_LOCATION_TOLERANCE_METERS
  }

  const aLabel = normalizeLabel(a.label)
  const bLabel = normalizeLabel(b.label)
  return aLabel !== '' && aLabel === bLabel
}
