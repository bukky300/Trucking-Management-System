import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Box, IconButton, Popover, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
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

function LegendItem({ type, label, isDark }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 20,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px / 14px',
          backgroundColor: stopMarkerColor(type),
          color: '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.92)'}`,
          boxShadow: '0 2px 6px rgba(2, 6, 23, 0.28)',
          flexShrink: 0,
        }}
      >
        {stopMarkerIcon(type)}
      </Box>
      <Typography variant="caption" sx={{ lineHeight: 1.25 }}>
        {label}
      </Typography>
    </Box>
  )
}

function capitalize(text) {
  if (!text) return ''
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

const MIN_ZOOM = 3.5
const MAX_ZOOM = 16

function MapView({ polyline, stops = [] }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
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
    if (stop?.type === 'eld_limit') return 'Daily driving limit'
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

      {/* Route legend — bottom left */}
      <Box
        sx={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          zIndex: 10,
          p: 1.25,
          borderRadius: 1,
          bgcolor: isDark
            ? alpha(theme.palette.background.paper, 0.9)
            : alpha(theme.palette.background.paper, 0.94),
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: isDark ? '0 4px 14px rgba(2,6,23,0.45)' : '0 3px 12px rgba(2,6,23,0.16)',
          minWidth: 176,
        }}
      >
        <Typography
          variant="caption"
          sx={{ display: 'block', fontWeight: 700, mb: 0.95, letterSpacing: 0.2 }}
        >
          Route Legend
        </Typography>
        <Box sx={{ display: 'grid', gap: 0.9 }}>
          <LegendItem type="pickup" label="Pre-trip" isDark={isDark} />
          <LegendItem type="break" label="30-min break" isDark={isDark} />
          <LegendItem type="fuel" label="Fuel" isDark={isDark} />
          <LegendItem type="eld_limit" label="Daily driving limit" isDark={isDark} />
          <LegendItem type="dropoff" label="Post-trip" isDark={isDark} />
        </Box>
      </Box>

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
