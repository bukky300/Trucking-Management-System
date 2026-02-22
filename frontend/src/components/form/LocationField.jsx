import { Autocomplete, Box, CircularProgress, Link, ListItemText, TextField, Typography } from '@mui/material'

function LocationField({
  label,
  state,
  options,
  loading,
  error,
  locating,
  locationError,
  onInputChange,
  onSelectChange,
  onUseCurrentLocation,
}) {
  return (
    <Box>
      <Autocomplete
        options={options}
        value={state.value}
        inputValue={state.inputValue}
        getOptionLabel={(option) => option?.label ?? ''}
        isOptionEqualToValue={(option, value) =>
          option.label === value.label && option.lng === value.lng && option.lat === value.lat
        }
        onInputChange={(_, value) => onInputChange(value)}
        onChange={(_, value) => onSelectChange(value)}
        loading={loading}
        noOptionsText={state.inputValue.trim().length < 3 ? 'Type at least 3 characters' : 'No matches'}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ py: 1.1 }}>
            <Typography sx={{ mr: 1 }}>📍</Typography>
            <ListItemText
              primary={option.label.split(',')[0] || option.label}
              secondary={option.label}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            fullWidth
            error={Boolean(error)}
            helperText={error ? 'Failed to load suggestions' : ''}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Link
        component="button"
        type="button"
        underline="hover"
        onClick={onUseCurrentLocation}
        disabled={locating}
        sx={{
          mt: 0.5,
          fontSize: 12,
          color: 'text.secondary',
        }}
      >
        {locating ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <CircularProgress size={12} color="inherit" />
            Use current location
          </Box>
        ) : (
          'Use current location'
        )}
      </Link>
      {locationError ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {locationError}
        </Typography>
      ) : null}
    </Box>
  )
}

export default LocationField
