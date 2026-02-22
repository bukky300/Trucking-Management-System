import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'

function formatHours(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const whole = Math.floor(value)
  const minutes = Math.round((value - whole) * 60)
  return `${whole}h ${minutes}m`
}

function formatMiles(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value).toLocaleString()} mi`
}

function complianceFromResponse(response) {
  if (typeof response?.summary?.hos_compliance === 'boolean') {
    return response.summary.hos_compliance
  }
  if (typeof response?.summary?.hos_compliant === 'boolean') {
    return response.summary.hos_compliant
  }
  if (typeof response?.hos_compliance === 'boolean') {
    return response.hos_compliance
  }
  if (typeof response?.hos_compliant === 'boolean') {
    return response.hos_compliant
  }
  return null
}

function TripSummaryPanel({ response }) {
  const distanceMiles = response?.route?.distance_miles
  const durationHours = response?.route?.duration_hours
  const totalDays = response?.summary?.total_days
  const compliance = complianceFromResponse(response)
  const stops = Array.isArray(response?.stops) ? response.stops : []

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Trip Summary</Typography>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Distance
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {formatMiles(distanceMiles)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Driving Hours
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {formatHours(durationHours)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Est. Duration
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {totalDays ?? '—'} {totalDays === 1 ? 'Day' : 'Days'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                HOS Compliance
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mt: 0.5,
                  color: compliance === null ? 'text.primary' : compliance ? 'success.main' : 'error.main',
                }}
              >
                {compliance === null ? '—' : compliance ? 'OK' : 'NON-COMPLIANT'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.2 }}>
            Stops Timeline
          </Typography>
          <Stack spacing={1}>
            {stops.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No stops available yet.
              </Typography>
            ) : (
              stops.map((stop, index) => (
                <Box
                  key={`${stop.type}-${index}`}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(stop.reason || stop.type || 'stop').toString().replace(/_/g, ' ')}
                    </Typography>
                    {typeof stop.mile === 'number' ? (
                      <Typography variant="caption" color="text.secondary">
                        Mile {Math.round(stop.mile)}
                      </Typography>
                    ) : null}
                  </Box>
                  <Chip
                    label={(stop.type || 'stop').toString().toUpperCase()}
                    size="small"
                    color={stop.type === 'pickup' ? 'success' : stop.type === 'dropoff' ? 'error' : 'primary'}
                    variant="outlined"
                  />
                </Box>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default TripSummaryPanel
