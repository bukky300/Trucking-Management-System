import { Box, Grid } from '@mui/material'
import PageShell from '../components/layout/PageShell'
import TripPlannerForm from '../components/form/TripPlannerForm'
import PreviewPanel from '../components/preview/PreviewPanel'

function PlanTrip({ onTripPlanned }) {
  return (
    <PageShell>
      <Box
        sx={{
          width: { xs: '100%', md: '80vw' },
          minHeight: { md: '80vh' },
          maxWidth: { xl: '1400px' },
          maxHeight: { xl: '920px' },
          display: 'flex',
          alignItems: { md: 'center' },
          mx: 'auto',
        }}
      >
        <Grid container alignItems="stretch" width="100%" sx={{ height: '100%' }}>
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', '& > *': { flex: 1, width: '100%' } }}>
            <TripPlannerForm onResult={onTripPlanned} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', '& > *': { flex: 1, width: '100%' } }}>
            <PreviewPanel />
          </Grid>
        </Grid>
      </Box>
    </PageShell>
  )
}

export default PlanTrip
