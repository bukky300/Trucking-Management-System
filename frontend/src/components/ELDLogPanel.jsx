import { Stack, Typography } from '@mui/material'
import ELDLogSheet from './ELDLogSheet'

function ELDLogPanel({ logs = [] }) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return <Typography sx={{ mt: 2 }}>No logs yet</Typography>
  }

  return (
    <Stack spacing={2} sx={{ mt: 0 }}>
      {logs.map((log, idx) => (
        <ELDLogSheet
          key={`${log?.day ?? idx}-${idx}`}
          day={log?.day ?? idx + 1}
          events={log?.events ?? []}
          remarks={log?.remarks ?? []}
        />
      ))}
    </Stack>
  )
}

export default ELDLogPanel
