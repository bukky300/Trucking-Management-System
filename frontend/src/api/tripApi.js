import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

export async function planTrip(data) {
  const response = await axios.post(`${API_BASE_URL}/api/trips/plan`, data)
  return response.data
}
