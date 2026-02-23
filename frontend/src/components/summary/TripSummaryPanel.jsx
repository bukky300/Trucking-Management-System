import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardContent, Grid, Slide, Stack, Typography,
} from '@mui/material'
import StopsTimelineCard from './StopsTimelineCard'

function formatHours(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)} h`
}

function formatMiles(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value).toLocaleString()} mi`
}

function complianceFromResponse(response) {
  if (typeof response?.summary?.hos_compliance === 'boolean') return response.summary.hos_compliance
  if (typeof response?.summary?.hos_compliant === 'boolean') return response.summary.hos_compliant
  if (typeof response?.hos_compliance === 'boolean') return response.hos_compliance
  if (typeof response?.hos_compliant === 'boolean') return response.hos_compliant
  return null
}

function TripSummaryPanel({ response }) {
  const [showHosReason, setShowHosReason] = useState(false)
  const distanceMiles = response?.route?.distance_miles
  const durationHours = response?.summary?.driving_hours
  const totalDays = response?.summary?.total_days
  const compliance = complianceFromResponse(response)
  const hosReasons = Array.isArray(response?.summary?.hos_reasons) ? response.summary.hos_reasons : []
  const stops = Array.isArray(response?.timeline_stops)
    ? response.timeline_stops
    : Array.isArray(response?.stops)
      ? response.stops
      : []

  useEffect(() => {
    if (compliance !== false || !hosReasons[0]) {
      setShowHosReason(false)
    }
  }, [compliance, hosReasons])

  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Distance</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{formatMiles(distanceMiles)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Driving Hours</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{formatHours(durationHours)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Est. Duration</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {totalDays ?? '—'} {totalDays === 1 ? 'Day' : 'Days'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent sx={{ overflow: 'hidden' }}>
              <Box sx={{ position: 'relative', minHeight: 55 }}>
                <Slide in={!showHosReason} direction="right" mountOnEnter unmountOnExit timeout={220}>
                  <Box sx={{ position: 'absolute', inset: 0 }}>
                    <Typography variant="body2" color="text.secondary">HOS Compliance</Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                      <Typography
                        variant="h5"
                        sx={{ color: compliance === null ? 'text.primary' : compliance ? 'success.main' : 'error.main' }}
                      >
                        {compliance === null ? '—' : compliance ? 'YES' : 'NO'}
                      </Typography>
                      {compliance === false && hosReasons[0] ? (
                        <Button size="small" variant="text" sx={{ px: 0.5, minWidth: 'auto' }} onClick={() => setShowHosReason(true)}>
                          View reason
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                </Slide>

                <Slide in={showHosReason} direction="left" mountOnEnter unmountOnExit timeout={220}>
                  <Box sx={{ position: 'absolute', inset: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Reason</Typography>
                      <Button size="small" variant="text" sx={{ px: 0.5, minWidth: 'auto' }} onClick={() => setShowHosReason(false)}>
                        Back
                      </Button>
                    </Box>
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.8, lineHeight: 1.4, pr: 1 }}>
                      {hosReasons[0] || 'No reason provided.'}
                    </Typography>
                  </Box>
                </Slide>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <StopsTimelineCard stops={stops} />
    </Stack>
  )
}

export default TripSummaryPanel
