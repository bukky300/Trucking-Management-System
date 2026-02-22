import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import PageShell from '../components/layout/PageShell'
import MapView from '../components/MapView'
import TripSummaryPanel from '../components/summary/TripSummaryPanel'
import ELDLogPanel from '../components/ELDLogPanel'

function TripSummary({ response, onPlanAnother }) {
  const polyline = response?.route?.polyline
  const stops = response?.stops || []
  const logs = response?.logs || []
  const hasPolyline = Array.isArray(polyline) && polyline.length > 0

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
            <Card>
              <CardContent>
                {hasPolyline ? (
                  <MapView polyline={polyline} stops={stops} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No route polyline returned yet.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <TripSummaryPanel response={response} />
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              ELD Daily Log
            </Typography>
            <ELDLogPanel logs={logs} />
          </CardContent>
        </Card>
      </Stack>
    </PageShell>
  )
}

export default TripSummary
