import { Box, Grid } from '@mui/material'
import PageShell from '../components/layout/PageShell'
import TripPlannerForm from '../components/form/TripPlannerForm'
import PreviewPanel from '../components/preview/PreviewPanel'

function PlanTrip({ onTripPlanned }) {
  return (
    <PageShell>
      <Box
        sx={{
          minHeight: { md: '80vh' },
          maxHeight: { xl: '920px' },
          display: 'flex',
          alignItems: { md: 'center' },
        }}
      >
        <Grid container alignItems="stretch" width="100%" sx={{ height: '100%' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TripPlannerForm onResult={onTripPlanned} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <PreviewPanel />
          </Grid>
        </Grid>
      </Box>
    </PageShell>
  )
}

export default PlanTrip
