import { useState } from 'react'
import TripForm from './components/TripForm'
import TripResult from './components/TripResult'

function App() {
  const [tripResponse, setTripResponse] = useState(null)

  return (
    <main style={{ padding: '16px' }}>
      <TripForm onResult={setTripResponse} />
      <TripResult response={tripResponse} />
    </main>
  )
}

export default App
