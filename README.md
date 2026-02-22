# Trucking-Management-System

## Backend env setup

Set `ORS_API_KEY` before running the Django backend (for OpenRouteService directions):

```bash
export ORS_API_KEY=your_openrouteservice_api_key
```

If `ORS_API_KEY` is missing or OpenRouteService fails, backend routing falls back to deterministic mock route data.
