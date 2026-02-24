# Truck Trip Planner — TMS + ELD Compliance Simulator

## Project Description
Truck Trip Planner is a full-stack truck trip planning and Hours of Service (HOS) visualization system that simulates driver schedules, compliance, and daily ELD logs.

The system:
- calculates routes
- generates required stops
- simulates HOS duty cycles
- produces ELD log timelines
- visualizes compliance and trip feasibility


<img width="1728" height="1117" alt="image" src="https://github.com/user-attachments/assets/8d44d23f-45d4-4a91-a74a-d0e93f368e00" />


<img width="3456" height="2234" alt="image" src="https://github.com/user-attachments/assets/b35fc5dd-7be6-472a-99f4-4acac1815141" />


## System Architecture
Flow:

`React Frontend`  
`→ Django REST API`  
`→ Route Service (OpenRouteService)`  
`→ Stop Planning Engine`  
`→ HOS Timeline Engine`  
`→ Log Formatter`  
`→ JSON Response`  
`→ Frontend Visualization`

## Backend (Django + DRF)
### Project Structure
- `config`
- `trips`
- `hos`
- `logs`
- `utils`

### API Endpoint
- `POST /api/trips/plan`
- Health endpoints for monitoring:
  - `GET /health`

### Request Normalization
Locations are accepted as:
- `string`
- object: `{ label, lng, lat }`

### Route Generation
- Uses OpenRouteService `driving-car` when coordinates are present and `ORS_API_KEY` is configured.
- Falls back to deterministic mock route data if ORS fails or coordinates are missing.

### Stop Planning Engine
- Always adds pickup and dropoff.
- Adds break stops every ~400 miles.
- Adds fuel stops every ~1000 miles.
- Uses polyline distance interpolation for stop placement.
- Prevents duplicate stop coordinates.
- Returns stops in travel order.

### Break + Fuel Merge Logic
If a break occurs within ±10 miles of a fuel stop:
- merged into one fuel stop
- `reason = "Fuel + 30-min break"`
- `duration_minutes = 45`
- `combined_break = true`

### Stop Metadata
Stops may include:
- `mile`
- `label`
- `reason`
- `duration_minutes`
- `combined_break`
- `eld_required`

### HOS Timeline Engine
Generates per-day logs with:
- duty status events
- day boundary handling
- pickup/break/fuel/dropoff remarks

Remark timing fields:
- `minute`
- `start_minute`
- `end_minute`

Also adds mandatory `eld_limit` remark when the 11-hour daily driving limit is reached.

### Timeline Stops
Backend derives `timeline_stops` from log remarks:
- sorted by `day` + `minute`
- includes compliance-relevant stops

### Summary Metrics
Response summary includes:
- `total_days` (`len(logs)`)
- `total_miles`
- `driving_hours`
- `cycle_remaining_hours_before`
- `cycle_remaining_hours_after`
- `hos_compliant`
- `hos_reasons`

### Compliance Rule Implemented
Trip is marked non-compliant when:
- `driving_hours + cycle_used_hours > 70`

Reason returned:
- `"Insufficient cycle hours remaining"`

### Automated Backend Tests
Tests cover:
- route + summary response contract
- `total_days` accuracy
- remark timing correctness
- break/fuel merge behavior
- 11-hour limit remark presence
- compliance outcomes

## Frontend (React + Vite + MUI + Mapbox)
### App Flow
Two pages:
- Plan Trip
- Trip Summary

### Global Theme System
- Light/dark mode
- Persisted theme preference
- Shared top bar

### Trip Planning Form
Fields:
- current location
- pickup location
- dropoff location
- cycle hours

Features:
- Mapbox autocomplete
- POI + address search
- debounced search
- geolocation + reverse geocode “Use current location”
- structured payload submission
- loading state on submit

### Form Validation
- required location fields
- cycle hours `>= 0`
- prevents identical pickup/dropoff
- prevents all three locations matching

### Map Rendering
- route polyline
- automatic bounds fitting
- custom stop markers
- marker popovers with:
  - reason
  - location label
  - mile marker
- reverse-geocoded labels with caching
- route legend overlay

### Stops Timeline Panel
- chronological stop display
- icon and color mapping
- ELD-required badges
- reverse-geocoded labels

### ELD Log Visualization
- multi-day SVG log sheets
- 4 duty rows always visible
- duty line rendering
- status totals
- remarks band with duration brackets
- overlap handling
- mobile font adjustments

### Logs Visibility Controls
- View Logs / Hide Logs toggle
- auto-scroll to logs when opened

### Compliance Summary UI
Displays:
- driving hours
- estimated trip days
- HOS compliance status (green/red)
- compliance reasons

### API Configuration
- Uses `VITE_API_BASE_URL` to switch API environments.

### Browser Branding
- page title: `Truck Trip Planner`
- truck favicon

## Deployment & Configuration
### Backend Requirements
`backend/requirements.txt` includes runtime dependencies and `gunicorn`.

### Production Environment Variables (Backend)
- `DJANGO_SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `ORS_API_KEY`

Example:
```bash
DJANGO_SECRET_KEY=your_strong_secret
DEBUG=False
ALLOWED_HOSTS=trucking-management-system.onrender.com,trucking-management-system.vercel.app
CORS_ALLOWED_ORIGINS=https://trucking-management-system.vercel.app
CSRF_TRUSTED_ORIGINS=https://trucking-management-system.vercel.app
ORS_API_KEY=your_openrouteservice_api_key
```

### Environment Variables (Frontend)
- `VITE_MAPBOX_TOKEN`
- `VITE_API_BASE_URL`

Example:
```bash
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_API_BASE_URL=https://trucking-management-system.onrender.com
```

### Deployment Targets
- Backend: Render
- Frontend: Vercel

## Running Locally
### Backend
1. Go to backend directory:
```bash
cd backend
```
2. Create and activate a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
```
3. Install dependencies:
```bash
pip install -r requirements.txt
```
4. Set backend env vars (minimum):
```bash
export ORS_API_KEY=your_openrouteservice_api_key
export DJANGO_SECRET_KEY=your_secret_key
export DEBUG=True
```
5. Run backend:
```bash
python manage.py runserver 8000
```

### Frontend
1. Go to frontend directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install
```
3. Set frontend env vars in `frontend/.env`:
```bash
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_API_BASE_URL=http://localhost:8000
```
4. Run frontend:
```bash
npm run dev
```

## Project Limitations
- Assumes a property-carrying driver profile.
- Assumes average driving speed (deterministic simulation assumptions).
- Not a certified legal compliance engine.
