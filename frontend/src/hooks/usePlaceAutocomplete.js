import { useEffect, useState } from 'react'
import axios from 'axios'

import { searchPlaces } from '../api/geocodeApi'

export function usePlaceAutocomplete(query) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 3) {
      setOptions([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed, controller.signal)
        setOptions(results)
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return
        }
        setOptions([])
        setError('Failed to load places')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  return { options, loading, error }
}
