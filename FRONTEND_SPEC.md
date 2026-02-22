# Frontend Specification – TMS + ELD Trip Planner

## Tech Stack (Locked)

- Vite + React
- MUI (Material UI)
- Axios for API calls
- react-map-gl (for Mapbox integration later)
- SVG for ELD log rendering

Do not introduce additional UI frameworks.

---

# Responsibilities

Frontend must:

1. Collect trip input from user
2. Send POST request to backend
3. Receive structured JSON response
4. Render:
   - Trip summary
   - Route map (later phase)
   - ELD logs (later phase)

Frontend contains ZERO HOS logic.

All rule enforcement lives in backend.

---

# Development Phases

## Phase 1 – Connectivity

- Create Trip form
- Connect to backend endpoint
- Render raw JSON response

## Phase 1.5 – Location Autocompletion

- Use Mapbox Geocoding API for address/place autocomplete (free tier)
- Use MUI Autocomplete component
- Debounce requests (250–400ms)
- Minimum 3 characters before querying
- Store selected locations as objects:

  {
    label: string,
    lng: number,
    lat: number
  }

- API request to backend must send locations as objects
- Backend should accept both formats during transition:
  - string
  - {label,lng,lat}

## Phase 2 – UI Structure

- Layout with MUI
- Create sections:
  - Trip Input
  - Map Container
  - Log Container
  - Summary Panel

## Phase 3 – Map Rendering

- Integrate Mapbox
- Render route polyline

## Phase 4 – ELD Log Rendering

- Build SVG-based 24-hour grid
- Render minute-based events

---

# Folder Structure

frontend/
  src/
    api/
      tripApi.js
    components/
      TripForm.jsx
      TripResult.jsx
      TripSummary.jsx
      MapView.jsx
      ELDLogSheet.jsx
    pages/
      Home.jsx
    App.jsx
    main.jsx

---

# API Endpoint

POST http://127.0.0.1:8000/api/trips/plan

Request:
{
  current_location: string,
  pickup_location: string,
  dropoff_location: string,
  cycle_used_hours: number
}

Response:
Matches PROJECT_SPEC.md exactly.