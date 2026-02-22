import axios from 'axios'

export async function planTrip(data) {
  const response = await axios.post('http://localhost:8000/api/trips/plan', data)
  return response.data
}
