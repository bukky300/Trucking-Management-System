import { Avatar, Box, IconButton, Paper, Stack, Typography } from '@mui/material'
import { useAppTheme } from '../theme/AppThemeProvider'

function TopBar() {
  const { mode, toggleMode } = useAppTheme()
  const isDark = mode === 'dark'

  return (
    <Paper
      component="header"
      sx={{
        p: 1.5,
        borderRadius: 0,
        borderLeft: 0,
        borderRight: 0,
        borderTop: 0,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.12)',
              color: 'primary.main',
              fontSize: 20,
            }}
          >
            🚚
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
              Truck Trip Planner
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dispatcher Console
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.25} alignItems="center">
          <IconButton
            onClick={toggleMode}
            sx={{
              width: 40,
              height: 40,
              border: '1px solid',
              borderColor: 'divider',
            }}
            aria-label="Toggle theme"
          >
            {isDark ? '☀' : '☾'}
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  )
}

export default TopBar
