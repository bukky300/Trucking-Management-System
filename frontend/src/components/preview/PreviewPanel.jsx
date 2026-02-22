import { Box, Card, CardContent, Typography } from '@mui/material'

function PreviewPanel() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', p: 0, position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.35), transparent 40%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.22), transparent 45%), linear-gradient(140deg, rgba(15,23,42,0.72), rgba(30,41,59,0.92))',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.58) 100%)',
          }}
        />
        <Box sx={{ position: 'absolute', left: 20, bottom: 20, right: 20 }}>
          <Typography variant="subtitle1" sx={{ color: 'common.white' }}>
            Route Preview
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Plan a trip to see route, stops, and ELD logs on the summary screen.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default PreviewPanel
