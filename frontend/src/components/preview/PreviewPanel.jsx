import { Box, Card, CardContent, useTheme } from '@mui/material'
import truckDayImage from '../../../assets/truck-day.jpg'
import truckNightImage from '../../../assets/truck-night.jpg'

function PreviewPanel() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const image = isDark ? truckNightImage : truckDayImage
  const overlay = isDark
    ? 'linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.48) 100%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(15,23,42,0.2) 100%)'

  return (
    <Card sx={{ height: '100%', borderRadius: 0 }}>
      <CardContent sx={{ height: '100%', p: 0, position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `${overlay}, url(${image})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      </CardContent>
    </Card>
  )
}

export default PreviewPanel
