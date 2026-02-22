import { Grid } from '@mui/material'
import PageShell from '../components/layout/PageShell'
import TripPlannerForm from '../components/form/TripPlannerForm'
import PreviewPanel from '../components/preview/PreviewPanel'

function PlanTrip({ onTripPlanned }) {
  return (
    <PageShell>
      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, md: 5 }}>
          <TripPlannerForm onResult={onTripPlanned} />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <PreviewPanel />
        </Grid>
      </Grid>
    </PageShell>
  )
}

export default PlanTrip
