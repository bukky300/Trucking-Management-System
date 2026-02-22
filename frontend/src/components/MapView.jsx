import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Box, IconButton, Popover, Typography } from '@mui/material'
import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import { reverseGeocodeLabel } from '../utils/geocode'

const routeLayer = {
  id: 'route-line',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#1976d2',
    'line-width': 4,
  },
}

const stopEmojiByType = {
  pickup: '📦',
  dropoff: '🏁',
  break: '☕',
  fuel: '⛽',
}

function capitalize(text) {
  if (!text) {
    return ''
  }
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function MapView({ polyline, stops = [] }) {
  const mapRef = useRef(null)
  const locationCacheRef = useRef({})
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedStop, setSelectedStop] = useState(null)
  const [popoverAnchorEl, setPopoverAnchorEl] = useState(null)
  const [stopLabelByKey, setStopLabelByKey] = useState({})
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  const geojson = useMemo(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: polyline ?? [],
      },
    }),
    [polyline],
  )

  const fitToRoute = useCallback(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !mapLoaded) return

    const hasPolyline = Array.isArray(polyline) && polyline.length > 0
    const hasStops = Array.isArray(stops) && stops.length > 0
    if (!hasPolyline && !hasStops) return

    map.resize()

    const bounds = new mapboxgl.LngLatBounds()
    if (hasPolyline) {
      for (const point of polyline) bounds.extend(point)
    }
    if (hasStops) {
      for (const stop of stops) {
        if (typeof stop?.lng === 'number' && typeof stop?.lat === 'number') {
          bounds.extend([stop.lng, stop.lat])
        }
      }
    }

    map.fitBounds(bounds, {
      padding: 60,
      duration: 0,
      maxZoom: 10,
    })
  }, [mapLoaded, polyline, stops])

  useEffect(() => {
    fitToRoute()
  }, [fitToRoute])

  useEffect(() => {
    const controller = new AbortController()
    const coordKey = (lng, lat) => {
      const lngNum = Number(lng)
      const latNum = Number(lat)
      if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) {
        return null
      }
      return `${lngNum.toFixed(5)},${latNum.toFixed(5)}`
    }

    const unresolved = (Array.isArray(stops) ? stops : []).filter((stop) => {
      const key = coordKey(stop?.lng, stop?.lat)
      return key && !locationCacheRef.current[key]
    })

    if (unresolved.length === 0) {
      setStopLabelByKey({ ...locationCacheRef.current })
      return () => controller.abort()
    }

    const run = async () => {
      for (const stop of unresolved) {
        if (controller.signal.aborted) {
          return
        }
        const key = coordKey(stop?.lng, stop?.lat)
        if (!key) {
          continue
        }
        const label = await reverseGeocodeLabel(stop.lng, stop.lat, token, controller.signal)
        locationCacheRef.current[key] = label
      }
      setStopLabelByKey({ ...locationCacheRef.current })
    }

    run()
    return () => controller.abort()
  }, [stops, token])

  const reasonFromStop = (stop) => {
    if (stop?.reason) {
      return stop.reason
    }
    if (stop?.type === 'pickup') return 'Pre-trip'
    if (stop?.type === 'break') return '30-min break'
    if (stop?.type === 'fuel') return 'Fuel'
    if (stop?.type === 'dropoff') return 'Post-trip'
    return capitalize(stop?.type || 'Stop')
  }

  const getLocationLabel = (stop) => {
    const key =
      typeof stop?.lng === 'number' && typeof stop?.lat === 'number'
        ? `${stop.lng.toFixed(5)},${stop.lat.toFixed(5)}`
        : null
    return (key && stopLabelByKey[key]) || 'LOC'
  }

  if (!token) {
    return <div>Missing VITE_MAPBOX_TOKEN. Add it to frontend/.env.</div>
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: '100%', height: 360 }}
      onLoad={() => {
        setMapLoaded(true)
        // Fit immediately after load as well
        setTimeout(fitToRoute, 0)
      }}
    >
      <Source id="route" type="geojson" data={geojson}>
        <Layer {...routeLayer} />
      </Source>
      {Array.isArray(stops)
        ? stops.map((stop, idx) => {
            if (typeof stop?.lng !== 'number' || typeof stop?.lat !== 'number') {
              return null
            }

            return (
              <Marker key={idx} longitude={stop.lng} latitude={stop.lat}>
                <Box
                  component="button"
                  type="button"
                  onClick={(event) => {
                    setSelectedStop(stop)
                    setPopoverAnchorEl(event.currentTarget)
                  }}
                  sx={{
                    fontSize: '18px',
                    lineHeight: 1,
                    background: 'transparent',
                    border: 0,
                    p: 0,
                    boxShadow: 1,
                    cursor: 'pointer',
                  }}
                >
                  {stopEmojiByType[stop.type] || '📍'}
                </Box>
              </Marker>
            )
          })
        : null}
      <Popover
        open={Boolean(selectedStop && popoverAnchorEl)}
        anchorEl={popoverAnchorEl}
        onClose={() => {
          setSelectedStop(null)
          setPopoverAnchorEl(null)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {selectedStop ? (
          <Box sx={{ p: 1.5, minWidth: 180 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2">{reasonFromStop(selectedStop)}</Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedStop(null)
                  setPopoverAnchorEl(null)
                }}
                sx={{
                  color: '#111827',
                  backgroundColor: '#e5e7eb',
                  '&:hover': { backgroundColor: '#d1d5db' },
                }}
              >
                x
              </IconButton>
            </Box>
            <Typography variant="body2">{getLocationLabel(selectedStop)}</Typography>
            {selectedStop.mile !== undefined && selectedStop.mile !== null ? (
              <Typography variant="body2">Mile {selectedStop.mile}</Typography>
            ) : null}
          </Box>
        ) : null}
      </Popover>
    </Map>
  )
}

export default MapView
