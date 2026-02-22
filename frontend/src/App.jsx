import { useState } from 'react'
import PlanTrip from './pages/PlanTrip'
import TripSummary from './pages/TripSummary'

function App() {
  const [tripResponse, setTripResponse] = useState(null)

  if (!tripResponse) {
    return <PlanTrip onTripPlanned={setTripResponse} />
  }

  return <TripSummary response={tripResponse} onPlanAnother={() => setTripResponse(null)} />
}

export default App
