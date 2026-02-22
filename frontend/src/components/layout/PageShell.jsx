import { Box, Container } from '@mui/material'
import TopBar from '../TopBar'

function PageShell({ children, cycleText }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar cycleText={cycleText} />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  )
}

export default PageShell
