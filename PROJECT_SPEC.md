# TMS + ELD Trip Planner – Project Specification

## Objective

Build a full-stack application using:

Backend:
- Django
- Django REST Framework

Frontend:
- React (Vite)
- TailwindCSS
- material ui

Map:
- Mapbox (free tier) OR OpenRouteService for routing
- react-map-gl for rendering Mapbox

Deployment:
- Backend: Render (free tier)
- Frontend: Vercel (free tier)
- Database: Render Postgres (free tier)

This is a deterministic HOS simulation app, not a certified compliance engine.

---

# Locked Technology Stack (Do Not Change)

Backend:
- Python 3.11+
- Django
- Django REST Framework
- PostgreSQL (production)
- SQLite (local development allowed)

Frontend:
- Vite + React
- TailwindCSS
- material ui
- react-map-gl (Mapbox integration)
- Axios for API calls

Routing API:
- OpenRouteService (preferred for free tier reliability)
- Fallback: Mapbox Directions API

No other libraries should be introduced without justification.

---

# Assumptions

- Property-carrying driver
- 70 hours / 8 day cycle
- 11-hour daily driving limit
- 14-hour shift window
- 30-minute break required after 8 hours driving
- Fuel stop every 1000 miles
- 1 hour pickup
- 1 hour dropoff
- No adverse driving conditions

---

# Architecture Overview

React Form
    ↓
POST /api/trips/plan
    ↓
Django REST API
    ↓
Route Service (OpenRouteService)
    ↓
HOS Engine (deterministic simulation)
    ↓
Log Formatter
    ↓
JSON Response
    ↓
Frontend renders:
    - Map via Mapbox
    - Trip summary
    - SVG-based ELD logs

---

# Repository Structure

tms-eld-app/
│
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── trips/
│   │   ├── hos/
│   │   └── logs/
│   └── utils/
│
├── frontend/
│   └── src/
│
└── PROJECT_SPEC.md

---

# Backend Responsibilities

trips app:
- POST /api/trips/plan
- Orchestrates route service and HOS engine
- Returns final JSON response

utils/route_service.py:
- Calls OpenRouteService
- Returns:
    - total distance (miles)
    - duration (hours)
    - polyline coordinates

hos app:
- Pure Python deterministic simulation
- No Django imports in engine
- Applies:
    - 11-hour limit
    - 14-hour shift window
    - 30-min break after 8 hours
    - Fuel stops every 1000 miles
    - Pickup & dropoff time
    - Cycle tracking

logs app:
- Converts HOS timeline to frontend-ready minute-based events
- Ensures full 24-hour coverage per day

---

# API Contract (Must Not Change)

POST /api/trips/plan

Request:
{
  "current_location": string,
  "pickup_location": string,
  "dropoff_location": string,
  "cycle_used_hours": number
}

Response:
{
  "route": {
    "distance_miles": number,
    "polyline": number[][]
  },
  "summary": {
    "total_days": number,
    "total_miles": number
  },
  "logs": [
    {
      "day": number,
      "events": [
        {
          "status": "driving" | "on_duty" | "off_duty" | "sleeper",
          "start_minute": number,
          "end_minute": number
        }
      ]
    }
  ]
}

---

# Rules for AI Code Generation

- Do NOT redesign architecture.
- Do NOT introduce new frameworks.
- Do NOT modify the API contract.
- Ask clarifying questions before making assumptions.
- If something is unclear, stop and ask.
- Use MCP tools (if available) for:
    - Reading project files
    - Inspecting current directory structure
    - Verifying environment setup
    - Running migrations or commands
- Never guess configuration values.
- Follow PROJECT_SPEC.md strictly.