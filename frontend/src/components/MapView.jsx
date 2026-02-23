import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Box, IconButton, Popover, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Close'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PlaceIcon from '@mui/icons-material/Place'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import HotelIcon from '@mui/icons-material/Hotel'
import FreeBreakfastIcon from '@mui/icons-material/FreeBreakfast'
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

function stopMarkerIcon(type) {
  switch ((type || '').toLowerCase()) {
    case 'pickup':
      return <LocalShippingIcon sx={{ fontSize: 13 }} />
    case 'dropoff':
      return <PlaceIcon sx={{ fontSize: 13 }} />
    case 'fuel':
      return <LocalGasStationIcon sx={{ fontSize: 13 }} />
    case 'sleeper':
    case 'rest':
      return <HotelIcon sx={{ fontSize: 13 }} />
    case 'eld_limit':
      return <HotelIcon sx={{ fontSize: 13 }} />
    case 'break':
      return <FreeBreakfastIcon sx={{ fontSize: 13 }} />
    default:
      return <PlaceIcon sx={{ fontSize: 13 }} />
  }
}

function stopMarkerColor(type) {
  switch ((type || '').toLowerCase()) {
    case 'pickup':
      return '#16a34a'
    case 'dropoff':
      return '#dc2626'
    case 'fuel':
      return '#1976d2'
    case 'sleeper':
    case 'rest':
      return '#7c3aed'
    case 'eld_limit':
      return '#7c3aed'
    case 'break':
      return '#f59e0b'
    default:
      return '#2563eb'
  }
}

function capitalize(text) {
  if (!text) return ''
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

const MIN_ZOOM = 3.5
const MAX_ZOOM = 16

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
      if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return null
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
        if (controller.signal.aborted) return
        const key = coordKey(stop?.lng, stop?.lat)
        if (!key) continue
        const label = await reverseGeocodeLabel(stop.lng, stop.lat, token, controller.signal)
        locationCacheRef.current[key] = label
      }
      setStopLabelByKey({ ...locationCacheRef.current })
    }

    run()
    return () => controller.abort()
  }, [stops, token])

  const reasonFromStop = (stop) => {
    if (stop?.reason) return stop.reason
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

  const handleZoomIn = () => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    map.zoomIn({ duration: 200 })
  }

  const handleZoomOut = () => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    map.zoomOut({ duration: 200 })
  }

  if (!token) {
    return <div>Missing VITE_MAPBOX_TOKEN. Add it to frontend/.env.</div>
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '75vh' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onLoad={() => {
          setMapLoaded(true)
          setTimeout(fitToRoute, 0)
        }}
      >
        <Source id="route" type="geojson" data={geojson}>
          <Layer {...routeLayer} />
        </Source>

        {Array.isArray(stops)
          ? stops.map((stop, idx) => {
              if (typeof stop?.lng !== 'number' || typeof stop?.lat !== 'number') return null
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
                      width: 20,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '10px / 14px',
                      backgroundColor: stopMarkerColor(stop.type),
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 2px 6px rgba(2, 6, 23, 0.3)',
                      cursor: 'pointer',
                      p: 0,
                    }}
                  >
                    {stopMarkerIcon(stop.type)}
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
          slotProps={{
            paper: {
              sx: {
                borderRadius: 2,
                overflow: 'hidden',
                minWidth: 220,
                maxWidth: 280,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                border: '1px solid',
                borderColor: 'divider',
                mb: 1,
              },
            },
          }}
        >
          {selectedStop ? (() => {
            const color = stopMarkerColor(selectedStop.type)
            return (
              <Box>
                {/* Colored header strip */}
                <Box
                  sx={{
                    bgcolor: color,
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: 26,
                        height: 26,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {stopMarkerIcon(selectedStop.type)}
                    </Box>
                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                      {reasonFromStop(selectedStop)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedStop(null)
                      setPopoverAnchorEl(null)
                    }}
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      p: 0.25,
                      '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
                    }}
                  >
                    <RemoveIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>

                {/* Body */}
                <Box sx={{ px: 1.5, py: 1.25, bgcolor: 'background.paper' }}>
                  {/* Location */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: selectedStop.mile != null ? 0.75 : 0 }}>
                    <PlaceIcon sx={{ fontSize: 15, color: 'text.disabled', mt: '2px', flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {getLocationLabel(selectedStop)}
                    </Typography>
                  </Box>

                  {/* Mile marker */}
                  {selectedStop.mile != null && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.5,
                        px: 0.9,
                        py: 0.3,
                        borderRadius: 1,
                        bgcolor: alpha(color, 0.1),
                        border: '1px solid',
                        borderColor: alpha(color, 0.25),
                      }}
                    >
                      <Typography variant="caption" sx={{ color, fontWeight: 700, lineHeight: 1 }}>
                        Mile {Math.round(selectedStop.mile)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })() : null}
        </Popover>
      </Map>

      {/* Zoom controls — top right */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={handleZoomIn}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
            width: 32,
            height: 32,
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={handleZoomOut}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 0,
            '&:hover': { bgcolor: 'action.hover' },
            width: 32,
            height: 32,
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

export default MapView
