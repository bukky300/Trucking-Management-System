import { Card, CardContent, Typography } from '@mui/material'
import ELDLogPanel from './ELDLogPanel'
import MapView from './MapView'

const sampleLogs = [
  {
    day: 1,
    events: [
      { status: 'OFF_DUTY', start: 0, end: 360 },
      { status: 'ON_DUTY_NOT_DRIVING', start: 360, end: 420 },
      { status: 'DRIVING', start: 420, end: 720 },
      { status: 'OFF_DUTY', start: 720, end: 750 },
      { status: 'DRIVING', start: 750, end: 960 },
      { status: 'ON_DUTY_NOT_DRIVING', start: 960, end: 1020 },
      { status: 'OFF_DUTY', start: 1020, end: 1440 },
    ],
    remarks: [
      { minute: 360, abbr: 'LAX', reason: 'PICKUP', lng: -118.2437, lat: 34.0522 },
      { minute: 720, abbr: 'MI400', reason: 'BREAK', lng: -116.7, lat: 34.8 },
      { minute: 960, abbr: 'MI700', reason: 'FUEL', lng: -115.9, lat: 35.4 },
      { minute: 1020, abbr: 'LAS', reason: 'DROPOFF', lng: -115.1398, lat: 36.1699 },
    ],
  },
]

function TripResult({ response }) {
  if (!response) {
    return null
  }

  const polyline = response?.route?.polyline
  const stops = response?.stops || []
  const logs = response?.logs || []
  const logsForDisplay = logs.length > 0 ? logs : sampleLogs
  const hasPolyline = Array.isArray(polyline) && polyline.length > 0

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Trip Result
        </Typography>
        {hasPolyline && <MapView polyline={polyline} stops={stops} />}
        {logs.length === 0 ? (
          <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
            Showing sample ELD log for visual verification (no backend logs yet).
          </Typography>
        ) : null}
        <ELDLogPanel logs={logsForDisplay} />
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </CardContent>
    </Card>
  )
}

export default TripResult
