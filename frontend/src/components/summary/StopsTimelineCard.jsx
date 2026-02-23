import { Box, Card, CardContent, Chip, Typography } from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PlaceIcon from '@mui/icons-material/Place'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation'
import HotelIcon from '@mui/icons-material/Hotel'
import FreeBreakfastIcon from '@mui/icons-material/FreeBreakfast'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

function stopIcon(type) {
  switch ((type || '').toLowerCase()) {
    case 'pickup': return <LocalShippingIcon sx={{ fontSize: 18 }} />
    case 'dropoff': return <PlaceIcon sx={{ fontSize: 18 }} />
    case 'fuel': return <LocalGasStationIcon sx={{ fontSize: 18 }} />
    case 'sleeper':
    case 'rest': return <HotelIcon sx={{ fontSize: 18 }} />
    case 'break': return <FreeBreakfastIcon sx={{ fontSize: 18 }} />
    default: return <PlaceIcon sx={{ fontSize: 18 }} />
  }
}

function stopColor(type) {
  switch ((type || '').toLowerCase()) {
    case 'pickup': return { bg: 'success.main', border: 'success.main' }
    case 'dropoff': return { bg: 'error.main', border: 'error.main' }
    case 'fuel': return { bg: '#1976d2', border: '#1976d2' }
    case 'sleeper':
    case 'rest': return { bg: 'secondary.main', border: 'secondary.main' }
    case 'break': return { bg: 'warning.main', border: 'warning.main' }
    default: return { bg: 'primary.main', border: 'primary.main' }
  }
}

function chipColor(type) {
  switch ((type || '').toLowerCase()) {
    case 'pickup': return 'success'
    case 'dropoff': return 'error'
    case 'fuel': return 'primary'
    case 'sleeper':
    case 'rest': return 'secondary'
    case 'break': return 'warning'
    default: return 'default'
  }
}

function StopRow({ stop, isLast }) {
  const colors = stopColor(stop.type)
  const label = (stop.reason || stop.type || 'Stop').toString().replace(/_/g, ' ')
  const chipLabel = (stop.type || 'Stop').toString().toUpperCase().replace(/_/g, ' ')

  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          {stopIcon(stop.type)}
        </Box>
        {!isLast && (
          <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', minHeight: 32, mt: 0.5 }} />
        )}
      </Box>

      <Box sx={{ flex: 1, pb: isLast ? 0 : 1 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {label}
              </Typography>
              {stop.address && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {stop.address}
                </Typography>
              )}
            </Box>
            <Chip
              label={chipLabel}
              size="small"
              color={chipColor(stop.type)}
              variant="outlined"
              sx={{ ml: 1, flexShrink: 0, fontWeight: 600, fontSize: '0.65rem' }}
            />
          </Box>

          {(stop.fuel_gallons || stop.break_duration || stop.eld_required || stop.duration_hours) && (
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1 }}>
              {stop.fuel_gallons && (
                <Chip
                  icon={<LocalGasStationIcon />}
                  label={`FUEL (${stop.fuel_gallons} GAL)`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
              {stop.break_duration && (
                <Chip
                  icon={<FreeBreakfastIcon />}
                  label={`${stop.break_duration} BREAK`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
              {stop.eld_required && (
                <Chip
                  label="ELD Required"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
              {stop.duration_hours && (
                <Chip
                  icon={<HotelIcon />}
                  label={`SLEEPER (${stop.duration_hours}H)`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
            </Box>
          )}

          {(stop.arrival_time || stop.departure_time) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              {stop.arrival_time && (
                <Typography variant="caption" color="text.secondary">
                  Arr: <strong>{stop.arrival_time}</strong>
                </Typography>
              )}
              {stop.departure_time && (
                <Typography variant="caption" color="text.secondary">
                  Dep: <strong>{stop.departure_time}</strong>
                </Typography>
              )}
            </Box>
          )}

          {!stop.arrival_time && typeof stop.mile === 'number' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Mile {Math.round(stop.mile)}
            </Typography>
          )}
        </Box>

        {!isLast && stop.next_drive && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 0.5, py: 0.8 }}>
            <ArrowDownwardIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              {stop.next_drive}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function StopsTimelineCard({ stops = [] }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.78rem', color: 'text.secondary' }}>
          Stops Timeline
        </Typography>

        {stops.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No stops available yet.</Typography>
        ) : (
          <Box
            sx={{
              maxHeight: 480,
              overflowY: 'auto',
              pr: 0.5,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
            }}
          >
            {stops.map((stop, index) => (
              <StopRow
                key={`${stop.type}-${index}`}
                stop={stop}
                isLast={index === stops.length - 1}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default StopsTimelineCard
