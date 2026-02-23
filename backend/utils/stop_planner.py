import math


EARTH_RADIUS_MILES = 3958.7613
BREAK_INTERVAL_MILES = 400
FUEL_INTERVAL_MILES = 1000


def _haversine_miles(point_a, point_b):
    lng1, lat1 = point_a
    lng2, lat2 = point_b

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = lat2_rad - lat1_rad
    dlng = math.radians(lng2 - lng1)

    sin_dlat = math.sin(dlat / 2)
    sin_dlng = math.sin(dlng / 2)
    a = sin_dlat * sin_dlat + math.cos(lat1_rad) * math.cos(lat2_rad) * sin_dlng * sin_dlng
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_MILES * c


def _interpolate_point(start, end, ratio):
    start_lng, start_lat = start
    end_lng, end_lat = end
    lng = start_lng + (end_lng - start_lng) * ratio
    lat = start_lat + (end_lat - start_lat) * ratio
    return [lng, lat]


def get_point_at_distance(polyline, target_miles):
    if not polyline:
        return None

    if target_miles <= 0:
        return polyline[0]

    accumulated = 0.0
    for idx in range(len(polyline) - 1):
        start = polyline[idx]
        end = polyline[idx + 1]
        segment_miles = _haversine_miles(start, end)
        next_accumulated = accumulated + segment_miles

        if target_miles <= next_accumulated and segment_miles > 0:
            ratio = (target_miles - accumulated) / segment_miles
            return _interpolate_point(start, end, ratio)

        accumulated = next_accumulated

    return polyline[-1]


def _location_coord(location):
    if (
        isinstance(location, dict)
        and location.get("lng") is not None
        and location.get("lat") is not None
    ):
        return [location["lng"], location["lat"]]
    return None


def _coord_key(lng, lat):
    return f"{round(lng, 6)}:{round(lat, 6)}"

def _stop_key(stop_type, lng, lat, mile):
    if stop_type in ("fuel", "break") and mile is not None:
        return f"{stop_type}:{int(round(mile))}"
    return f"{stop_type}:{round(lng, 6)}:{round(lat, 6)}"


def _add_stop(
    stops,
    seen_coords,
    stop_type,
    lng,
    lat,
    mile=None,
    label=None,
    eld_required=False,
    allow_duplicate=False,
):
    if lng is None or lat is None:
        return

    key = _stop_key(stop_type, lng, lat, mile)
    if (not allow_duplicate) and key in seen_coords:
        return

    stop = {"type": stop_type, "lat": lat, "lng": lng}
    if mile is not None:
        stop["mile"] = round(mile, 2)
    if label:
        stop["label"] = str(label)
    if eld_required:
        stop["eld_required"] = True

    stops.append(stop)
    seen_coords.add(key)


def plan_stops(route, pickup, dropoff):
    polyline = route.get("polyline") if isinstance(route, dict) else None
    distance_miles = float(route.get("distance_miles", 0) or 0) if isinstance(route, dict) else 0

    pickup_coord = _location_coord(pickup)
    dropoff_coord = _location_coord(dropoff)

    if polyline:
        pickup_coord = polyline[0]
        dropoff_coord = polyline[-1]

    stops = []
    seen_coords = set()

    if pickup_coord:
        _add_stop(
            stops,
            seen_coords,
            "pickup",
            pickup_coord[0],
            pickup_coord[1],
            mile=0,
            label=pickup.get("label") if isinstance(pickup, dict) else None,
            allow_duplicate=True,
        )

    if not polyline:
        if dropoff_coord:
            _add_stop(
                stops,
                seen_coords,
                "dropoff",
                dropoff_coord[0],
                dropoff_coord[1],
                mile=distance_miles,
                label=dropoff.get("label") if isinstance(dropoff, dict) else None,
                allow_duplicate=True,
            )
        return stops

    interval_targets = []

    next_break = BREAK_INTERVAL_MILES
    while next_break < distance_miles:
        interval_targets.append((next_break, "break"))
        next_break += BREAK_INTERVAL_MILES

    next_fuel = FUEL_INTERVAL_MILES
    while next_fuel < distance_miles:
        interval_targets.append((next_fuel, "fuel"))
        next_fuel += FUEL_INTERVAL_MILES

    interval_targets.sort(key=lambda item: (item[0], item[1]))

    for target_miles, stop_type in interval_targets:
        point = get_point_at_distance(polyline, target_miles)
        if not point:
            continue
        _add_stop(
            stops,
            seen_coords,
            stop_type,
            point[0],
            point[1],
            mile=target_miles,
            eld_required=(stop_type == "break"),
            allow_duplicate=False,
        )

    # Merge break stops into nearby fuel stops (within +/-10 miles).
    fuel_indices = [
        idx
        for idx, stop in enumerate(stops)
        if stop.get("type") == "fuel" and stop.get("mile") is not None
    ]
    break_indices = [
        idx
        for idx, stop in enumerate(stops)
        if stop.get("type") == "break" and stop.get("mile") is not None
    ]
    merged_break_indices = set()

    for fuel_idx in fuel_indices:
        fuel_stop = stops[fuel_idx]
        fuel_mile = float(fuel_stop.get("mile"))

        match_idx = None
        match_delta = None
        for break_idx in break_indices:
            if break_idx in merged_break_indices:
                continue
            break_mile = float(stops[break_idx].get("mile"))
            delta = abs(break_mile - fuel_mile)
            if delta <= 10 and (match_delta is None or delta < match_delta):
                match_idx = break_idx
                match_delta = delta

        if match_idx is not None:
            merged_break_indices.add(match_idx)
            fuel_stop["combined_break"] = True
            fuel_stop["reason"] = "Fuel + 30-min break"
            fuel_stop["duration_minutes"] = 45
            fuel_stop["eld_required"] = True

    if merged_break_indices:
        stops = [stop for idx, stop in enumerate(stops) if idx not in merged_break_indices]

    if dropoff_coord:
        _add_stop(
            stops,
            seen_coords,
            "dropoff",
            dropoff_coord[0],
            dropoff_coord[1],
            mile=distance_miles,
            label=dropoff.get("label") if isinstance(dropoff, dict) else None,
            allow_duplicate=True,
        )

    return stops
