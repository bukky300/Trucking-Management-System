# Trucking-Management-System

## Backend env setup

Set `ORS_API_KEY` before running the Django backend (for OpenRouteService directions):

```bash
export ORS_API_KEY=your_openrouteservice_api_key
```

If `ORS_API_KEY` is missing or OpenRouteService fails, backend routing falls back to deterministic mock route data.

Backend deployment env vars:

```bash
DJANGO_SECRET_KEY=your_strong_secret
DEBUG=False
ALLOWED_HOSTS=trucking-management-system.onrender.com
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com
ORS_API_KEY=your_openrouteservice_api_key
```

Frontend deployment env var:

```bash
VITE_API_BASE_URL=https://trucking-management-system.onrender.com
```
