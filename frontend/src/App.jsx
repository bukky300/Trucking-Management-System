import { Box, Fade } from '@mui/material'
import { useMemo, useState } from 'react'
import PlanTrip from './pages/PlanTrip'
import TripSummary from './pages/TripSummary'

function App() {
  const [tripResponse, setTripResponse] = useState(null)
  const isSummary = Boolean(tripResponse)
  const pageKey = isSummary ? 'trip-summary' : 'plan-trip'
  const page = useMemo(() => {
    if (!tripResponse) {
      return <PlanTrip onTripPlanned={setTripResponse} />
    }
    return <TripSummary response={tripResponse} onPlanAnother={() => setTripResponse(null)} />
  }, [tripResponse])

  return (
    <Fade in timeout={520} key={pageKey}>
      <Box>{page}</Box>
    </Fade>
  )
}

export default App
