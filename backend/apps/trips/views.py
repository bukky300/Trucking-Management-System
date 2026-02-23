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


def compute_summary_metrics(days, cycle_used_hours):
    days = days or []
    cycle_used = _to_float(cycle_used_hours)
    if cycle_used is None:
        cycle_used = 0.0

    driving_minutes = 0
    for day in days:
        for event in day.get("events", []):
            status = str(event.get("status", "")).strip().lower()
            if status != "driving":
                continue

            start_minute = _to_float(event.get("start_minute"))
            end_minute = _to_float(event.get("end_minute"))
            if start_minute is None or end_minute is None or end_minute <= start_minute:
                continue
            driving_minutes += end_minute - start_minute

    driving_hours_raw = driving_minutes / 60.0
    driving_hours = round(driving_hours_raw, 2)
    total_cycle_after = cycle_used + driving_hours_raw

    hos_compliant = total_cycle_after <= 70.0
    hos_reasons = [] if hos_compliant else ["Insufficient cycle hours remaining"]

    return {
        "driving_hours": driving_hours,
        "hos_compliant": hos_compliant,
        "hos_reasons": hos_reasons,
        "cycle_remaining_hours_before": round(70.0 - cycle_used, 2),
        "cycle_remaining_hours_after": round(70.0 - total_cycle_after, 2),
    }


def _build_timeline_stops(logs):
    timeline_stops = []

    for day in logs or []:
        day_number = day.get("day")
        for remark in day.get("remarks", []):
            stop_type = str(remark.get("stop_type", "")).lower() or "stop"
            timeline_stops.append(
                {
                    "type": stop_type,
                    "reason": remark.get("reason"),
                    "label": remark.get("label"),
                    "eld_required": (stop_type == "eld_limit") or bool(remark.get("eld_required")),
                    "day": day_number,
                    "minute": remark.get("minute"),
                    "start_minute": remark.get("start_minute"),
                    "end_minute": remark.get("end_minute"),
                    "mile": remark.get("mile"),
                    "lng": remark.get("lng"),
                    "lat": remark.get("lat"),
                }
            )

    timeline_stops.sort(
        key=lambda item: (
            int(item.get("day") or 0),
            int(item.get("minute") or 0),
        )
    )

    return timeline_stops


class PlanTripView(APIView):
    def post(self, request):
        current_location = _normalize_location(request.data.get("current_location"))
        pickup_location = _normalize_location(request.data.get("pickup_location"))
        dropoff_location = _normalize_location(request.data.get("dropoff_location"))
        cycle_used_hours = request.data.get("cycle_used_hours")

        route_data = get_route(
            pickup_location,
            dropoff_location,
        )
        stops = plan_stops(route_data, pickup_location, dropoff_location)
        logs = generate_hos_logs(route_data, stops)
        timeline_stops = _build_timeline_stops(logs)
        summary_metrics = compute_summary_metrics(logs, cycle_used_hours)

        return Response(
            {
                "route": {
                    "distance_miles": route_data["distance_miles"],
                    "polyline": route_data["polyline"],
                },
                "summary": {
                    "total_days": len(logs),
                    "total_miles": route_data["distance_miles"],
                    "driving_hours": summary_metrics["driving_hours"],
                    "hos_compliant": summary_metrics["hos_compliant"],
                    "hos_reasons": summary_metrics["hos_reasons"],
                    "cycle_remaining_hours_before": summary_metrics["cycle_remaining_hours_before"],
                    "cycle_remaining_hours_after": summary_metrics["cycle_remaining_hours_after"],
                },
                "stops": stops,
                "timeline_stops": timeline_stops,
                "logs": logs,
            }
        )
