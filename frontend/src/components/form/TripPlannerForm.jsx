import { useRef, useState } from 'react'
import axios from 'axios'
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material'
import { planTrip } from '../../api/tripApi'
import { reverseGeocode } from '../../api/geocodeApi'
import { usePlaceAutocomplete } from '../../hooks/usePlaceAutocomplete'
import { locationEquals } from '../../utils/locationEquals'
import LocationField from './LocationField'

const initialLocationField = { value: null, inputValue: '' }
const initialForm = {
  current_location: { ...initialLocationField },
  pickup_location: { ...initialLocationField },
  dropoff_location: { ...initialLocationField },
  cycle_used_hours: '',
}

function TripPlannerForm({ onResult }) {
  const [formData, setFormData] = useState(initialForm)
  const [locating, setLocating] = useState({
    current_location: false,
    pickup_location: false,
    dropoff_location: false,
  })
  const [locationErrors, setLocationErrors] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
  })
  const reverseAbortControllersRef = useRef({
    current_location: null,
    pickup_location: null,
    dropoff_location: null,
  })

  const currentPlaces = usePlaceAutocomplete(formData.current_location.inputValue)
  const pickupPlaces = usePlaceAutocomplete(formData.pickup_location.inputValue)
  const dropoffPlaces = usePlaceAutocomplete(formData.dropoff_location.inputValue)

  const clearLocationError = (fieldName) => {
    setLocationErrors((prev) => ({ ...prev, [fieldName]: '' }))
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

  const geolocationErrorMessage = (error) => {
    if (!error || typeof error.code !== 'number') {
      return 'Unable to get your location.'
    }
    if (error.code === 1) return 'Location permission denied.'
    if (error.code === 2) return 'Location unavailable.'
    if (error.code === 3) return 'Location request timed out.'
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
    setLocating((prev) => ({ ...prev, [fieldName]: true }))
    clearLocationError(fieldName)

    try {
      const position = await getCurrentPosition()
      const lng = position.coords.longitude
      const lat = position.coords.latitude

      const previousController = reverseAbortControllersRef.current[fieldName]
      if (previousController) previousController.abort()

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
        setLocationErrors((prev) => ({ ...prev, [fieldName]: geolocationErrorMessage(error) }))
        return
      }
      setLocationErrors((prev) => ({ ...prev, [fieldName]: 'Failed to reverse geocode current location.' }))
    } finally {
      setLocating((prev) => ({ ...prev, [fieldName]: false }))
    }
  }

  const toLocationPayload = (field) => {
    if (field.value) return field.value
    const label = field.inputValue.trim()
    if (!label) return null
    return { label, lng: null, lat: null }
  }

  const getLabel = (field) => {
    if (field.value?.label) return field.value.label.trim()
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

  const handleClear = () => {
    setFormData(initialForm)
    setLocationErrors({ current_location: '', pickup_location: '', dropoff_location: '' })
  }

  return (
    <Card sx={{ height: '100%', borderRadius: 0}}>
      <CardContent sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="h5">Plan New Trip</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enter route details to calculate ELD compliance and trip timing.
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.8 }}>
          <LocationField
            label="CURRENT LOCATION"
            state={formData.current_location}
            options={currentPlaces.options}
            loading={currentPlaces.loading}
            error={currentPlaces.error}
            locating={locating.current_location}
            locationError={locationErrors.current_location}
            onInputChange={(value) => handleLocationInputChange('current_location', value)}
            onSelectChange={(value) => handleLocationSelectChange('current_location', value)}
            onUseCurrentLocation={() => handleUseCurrentLocation('current_location')}
          />

          <LocationField
            label="Pickup Location"
            state={formData.pickup_location}
            options={pickupPlaces.options}
            loading={pickupPlaces.loading}
            error={pickupPlaces.error}
            locating={locating.pickup_location}
            locationError={locationErrors.pickup_location}
            onInputChange={(value) => handleLocationInputChange('pickup_location', value)}
            onSelectChange={(value) => handleLocationSelectChange('pickup_location', value)}
            onUseCurrentLocation={() => handleUseCurrentLocation('pickup_location')}
          />

          <LocationField
            label="Dropoff Location"
            state={formData.dropoff_location}
            options={dropoffPlaces.options}
            loading={dropoffPlaces.loading}
            error={dropoffPlaces.error}
            locating={locating.dropoff_location}
            locationError={locationErrors.dropoff_location}
            onInputChange={(value) => handleLocationInputChange('dropoff_location', value)}
            onSelectChange={(value) => handleLocationSelectChange('dropoff_location', value)}
            onUseCurrentLocation={() => handleUseCurrentLocation('dropoff_location')}
          />

          <TextField
            label="Cycle Hours Remaining"
            name="cycle_used_hours"
            type="number"
            value={formData.cycle_used_hours}
            onChange={(event) => setFormData((prev) => ({ ...prev, cycle_used_hours: event.target.value }))}
            inputProps={{ min: 0 }}
            fullWidth
          />

          {allLocationsSame ? (
            <Typography variant="caption" color="error">
              Current, pickup, and dropoff cannot all be the same location.
            </Typography>
          ) : null}

          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button type="button" variant="text" color="inherit" onClick={handleClear}>
              Clear Form
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!hasAllLocations || !isCycleValid || allLocationsSame}
              sx={{ px: 3 }}
            >
              Plan Trip
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

export default TripPlannerForm
