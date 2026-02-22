import { createTheme } from '@mui/material/styles'

const shape = { borderRadius: 16 }

export function getTheme(mode = 'light') {
  const isDark = mode === 'dark'

  return createTheme({
    shape,
    palette: {
      mode,
      ...(isDark
        ? {
            primary: { main: '#3b82f6' },
            background: {
              default: '#050f24',
              paper: '#152543',
            },
            text: {
              primary: '#f8fafc',
              secondary: '#9bb0d3',
            },
            divider: 'rgba(155, 176, 211, 0.24)',
            success: { main: '#22c55e' },
            error: { main: '#ef4444' },
          }
        : {
            primary: { main: '#2563eb' },
            background: {
              default: '#eef2f7',
              paper: '#ffffff',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
            divider: 'rgba(15, 23, 42, 0.1)',
            success: { main: '#16a34a' },
            error: { main: '#dc2626' },
          }),
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
          },
          '#root': {
            minHeight: '100vh',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(148, 163, 184, 0.22)',
            boxShadow: isDark ? '0 12px 30px rgba(2, 6, 23, 0.35)' : '0 10px 22px rgba(15, 23, 42, 0.08)',
            backgroundImage: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(2, 12, 35, 0.66)' : '#fff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(147, 197, 253, 0.2)' : 'rgba(100, 116, 139, 0.28)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(147, 197, 253, 0.55)' : 'rgba(59, 130, 246, 0.5)',
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: isDark ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.3)',
            boxShadow: isDark ? '0 18px 34px rgba(2, 6, 23, 0.5)' : '0 12px 30px rgba(15, 23, 42, 0.12)',
          },
          option: {
            minHeight: 44,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          containedPrimary: {
            boxShadow: isDark ? '0 10px 24px rgba(37, 99, 235, 0.35)' : '0 8px 18px rgba(37, 99, 235, 0.22)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
          },
        },
      },
    },
  })
}
