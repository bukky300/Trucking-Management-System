import { useRef, useState } from 'react'
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { planTrip } from '../api/tripApi'
import { reverseGeocode } from '../api/geocodeApi'
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete'
import { locationEquals } from '../utils/locationEquals'

function TripForm({ onResult }) {
  const [formData, setFormData] = useState({
    current_location: { value: null, inputValue: '' },
    pickup_location: { value: null, inputValue: '' },
    dropoff_location: { value: null, inputValue: '' },
    cycle_used_hours: '',
  })
  const [locatingCurrent, setLocatingCurrent] = useState(false)
  const [locatingPickup, setLocatingPickup] = useState(false)
  const [locatingDropoff, setLocatingDropoff] = useState(false)
  const [locationErrorCurrent, setLocationErrorCurrent] = useState('')
  const [locationErrorPickup, setLocationErrorPickup] = useState('')
  const [locationErrorDropoff, setLocationErrorDropoff] = useState('')
  const reverseAbortControllersRef = useRef({
    current_location: null,
    pickup_location: null,
    dropoff_location: null,
  })

  const currentPlaces = usePlaceAutocomplete(formData.current_location.inputValue)
  const pickupPlaces = usePlaceAutocomplete(formData.pickup_location.inputValue)
  const dropoffPlaces = usePlaceAutocomplete(formData.dropoff_location.inputValue)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLocationInputChange = (fieldName, inputValue) => {
    clearLocationError(fieldName)

    setFormData((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        inputValue,
        value: prev[fieldName].value?.label === inputValue ? prev[fieldName].value : null,
      },
    }))
  }

  const handleLocationSelectChange = (fieldName, selectedValue) => {
    clearLocationError(fieldName)

    setFormData((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value: selectedValue,
      },
    }))
  }

  const toLocationPayload = (field) => {
    if (field.value) {
      return field.value
    }

    const label = field.inputValue.trim()
    if (!label) {
      return null
    }

    return {
      label,
      lng: null,
      lat: null,
    }
  }

  const getLabel = (field) => {
    if (field.value?.label) {
      return field.value.label.trim()
    }
    return field.inputValue.trim()
  }

  const currentLocationPayload = toLocationPayload(formData.current_location)
  const pickupLocationPayload = toLocationPayload(formData.pickup_location)
  const dropoffLocationPayload = toLocationPayload(formData.dropoff_location)

  const cycleUsedHours = Number(formData.cycle_used_hours)
  const isCycleValid = Number.isFinite(cycleUsedHours) && cycleUsedHours >= 0
  const hasAllLocations =
    getLabel(formData.current_location) !== '' &&
    getLabel(formData.pickup_location) !== '' &&
    getLabel(formData.dropoff_location) !== ''
  const allLocationsSame =
    locationEquals(currentLocationPayload, pickupLocationPayload) &&
    locationEquals(currentLocationPayload, dropoffLocationPayload) &&
    locationEquals(pickupLocationPayload, dropoffLocationPayload)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      current_location: currentLocationPayload,
      pickup_location: pickupLocationPayload,
      dropoff_location: dropoffLocationPayload,
      cycle_used_hours: cycleUsedHours,
    }

    const result = await planTrip(payload)
    onResult(result)
  }

  const clearLocationError = (fieldName) => {
    if (fieldName === 'current_location') {
      setLocationErrorCurrent('')
      return
    }
    if (fieldName === 'pickup_location') {
      setLocationErrorPickup('')
      return
    }
    setLocationErrorDropoff('')
  }

  const setLocating = (fieldName, isLoading) => {
    if (fieldName === 'current_location') {
      setLocatingCurrent(isLoading)
      return
    }
    if (fieldName === 'pickup_location') {
      setLocatingPickup(isLoading)
      return
    }
    setLocatingDropoff(isLoading)
  }

  const setLocationError = (fieldName, errorMessage) => {
    if (fieldName === 'current_location') {
      setLocationErrorCurrent(errorMessage)
      return
    }
    if (fieldName === 'pickup_location') {
      setLocationErrorPickup(errorMessage)
      return
    }
    setLocationErrorDropoff(errorMessage)
  }

  const getLocationError = (fieldName) => {
    if (fieldName === 'current_location') {
      return locationErrorCurrent
    }
    if (fieldName === 'pickup_location') {
      return locationErrorPickup
    }
    return locationErrorDropoff
  }

  const getLocating = (fieldName) => {
    if (fieldName === 'current_location') {
      return locatingCurrent
    }
    if (fieldName === 'pickup_location') {
      return locatingPickup
    }
    return locatingDropoff
  }

  const geolocationErrorMessage = (error) => {
    if (!error || typeof error.code !== 'number') {
      return 'Unable to get your location.'
    }

    if (error.code === 1) {
      return 'Location permission denied.'
    }
    if (error.code === 2) {
      return 'Location unavailable.'
    }
    if (error.code === 3) {
      return 'Location request timed out.'
    }
    return 'Unable to get your location.'
  }

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      })
    })

  const handleUseCurrentLocation = async (fieldName) => {
    setLocating(fieldName, true)
    clearLocationError(fieldName)

    try {
      const position = await getCurrentPosition()
      const lng = position.coords.longitude
      const lat = position.coords.latitude

      const previousController = reverseAbortControllersRef.current[fieldName]
      if (previousController) {
        previousController.abort()
      }

      const controller = new AbortController()
      reverseAbortControllersRef.current[fieldName] = controller

      const selectedLocation = await reverseGeocode(lng, lat, controller.signal)

      setFormData((prev) => ({
        ...prev,
        [fieldName]: {
          value: selectedLocation,
          inputValue: selectedLocation.label,
        },
      }))
    } catch (error) {
      if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return
      }

      if (typeof error.code === 'number') {
        setLocationError(fieldName, geolocationErrorMessage(error))
        return
      }

      setLocationError(fieldName, 'Failed to reverse geocode current location.')
    } finally {
      setLocating(fieldName, false)
    }
  }

  const renderLocationAutocomplete = (fieldName, label, state, autocompleteState) => {
    const locating = getLocating(fieldName)
    const locationError = getLocationError(fieldName)

    return (
      <>
        <Autocomplete
          options={autocompleteState.options}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) =>
            option.label === value.label && option.lng === value.lng && option.lat === value.lat
          }
          value={state.value}
          inputValue={state.inputValue}
          onInputChange={(_, newInputValue) => handleLocationInputChange(fieldName, newInputValue)}
          onChange={(_, newValue) => handleLocationSelectChange(fieldName, newValue)}
          loading={autocompleteState.loading}
          noOptionsText={state.inputValue.trim().length < 3 ? 'Type at least 3 characters' : 'No matches'}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              margin="normal"
              fullWidth
              error={Boolean(autocompleteState.error)}
              helperText={autocompleteState.error ? 'Failed to load suggestions' : ''}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {autocompleteState.loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <Button
          type="button"
          variant="text"
          size="small"
          disabled={locating}
          onClick={() => handleUseCurrentLocation(fieldName)}
          sx={{ mt: 0.5, mb: 1.5 }}
        >
          {locating ? (
            <>
              <CircularProgress size={14} sx={{ mr: 1 }} />
              Locating...
            </>
          ) : (
            'Use my current location'
          )}
        </Button>
        {locationError ? (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
            {locationError}
          </Typography>
        ) : null}
      </>
    )
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {renderLocationAutocomplete(
            'current_location',
            'Current Location',
            formData.current_location,
            currentPlaces,
          )}
          {renderLocationAutocomplete(
            'pickup_location',
            'Pickup Location',
            formData.pickup_location,
            pickupPlaces,
          )}
          {renderLocationAutocomplete(
            'dropoff_location',
            'Dropoff Location',
            formData.dropoff_location,
            dropoffPlaces,
          )}
          <TextField
            label="Cycle Used Hours"
            name="cycle_used_hours"
            type="number"
            value={formData.cycle_used_hours}
            onChange={handleChange}
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />
          {allLocationsSame ? (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
              Current, pickup, and dropoff cannot all be the same location.
            </Typography>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            disabled={!hasAllLocations || !isCycleValid || allLocationsSame}
          >
            Plan Trip
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default TripForm
