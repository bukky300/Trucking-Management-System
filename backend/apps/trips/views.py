from rest_framework.response import Response
from rest_framework.views import APIView

from utils.hos_engine import generate_hos_logs
from utils.route_service import get_route
from utils.stop_planner import plan_stops


def _to_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_location(location):
    if isinstance(location, dict):
        return {
            "label": str(location.get("label", "")).strip(),
            "lng": _to_float(location.get("lng")),
            "lat": _to_float(location.get("lat")),
        }

    if isinstance(location, str):
        return {"label": location.strip(), "lng": None, "lat": None}

    return {"label": "", "lng": None, "lat": None}


class PlanTripView(APIView):
    def post(self, request):
        current_location = _normalize_location(request.data.get("current_location"))
        pickup_location = _normalize_location(request.data.get("pickup_location"))
        dropoff_location = _normalize_location(request.data.get("dropoff_location"))

        route_data = get_route(
            pickup_location,
            dropoff_location,
        )
        stops = plan_stops(route_data, pickup_location, dropoff_location)
        logs = generate_hos_logs(route_data, stops)

        return Response(
            {
                "route": {
                    "distance_miles": route_data["distance_miles"],
                    "polyline": route_data["polyline"],
                },
                "summary": {
                    "total_days": 1,
                    "total_miles": route_data["distance_miles"],
                },
                "stops": stops,
                "logs": logs,
            }
        )
