import { useEffect, useRef, useState } from 'react'
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import PageShell from '../components/layout/PageShell'
import MapView from '../components/MapView'
import TripSummaryPanel from '../components/summary/TripSummaryPanel'
import ELDLogPanel from '../components/ELDLogPanel'

function TripSummary({ response, onPlanAnother }) {
  const [showLogs, setShowLogs] = useState(false)
  const logsSectionRef = useRef(null)
  const polyline = response?.route?.polyline
  const stops = response?.stops || []
  const timelineStops = Array.isArray(response?.timeline_stops) ? response.timeline_stops : []
  const mapStops =
    timelineStops.length > 0
      ? timelineStops.filter(
          (stop) => typeof stop?.lng === 'number' && Number.isFinite(stop.lng)
            && typeof stop?.lat === 'number' && Number.isFinite(stop.lat),
        )
      : stops
  const logs = response?.logs || []
  const hasPolyline = Array.isArray(polyline) && polyline.length > 0

  useEffect(() => {
    if (!showLogs || !logsSectionRef.current) return
    logsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showLogs])

  return (
    <PageShell>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Trip Summary</Typography>
          <Button variant="outlined" onClick={onPlanAnother}>
            Plan Another Trip
          </Button>
        </Box>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Stack spacing={1} alignItems="flex-start">
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  {hasPolyline ? (
                    <MapView polyline={polyline} stops={mapStops} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No route polyline returned yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
              <Button
                size="small"
                variant="text"
                onClick={() => setShowLogs((prev) => !prev)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {showLogs ? 'Hide logs' : 'View logs'}
              </Button>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <TripSummaryPanel response={response} />
          </Grid>
        </Grid>

        {showLogs ? (
          <Card ref={logsSectionRef}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                ELD Daily Log
              </Typography>
              <ELDLogPanel logs={logs} />
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </PageShell>
  )
}

export default TripSummary
