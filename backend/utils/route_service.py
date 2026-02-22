import json
import os
from urllib import error, request
from dotenv import load_dotenv  

load_dotenv()

def get_mock_route(current_location, pickup_location, dropoff_location):
    # Deterministic placeholder route for connectivity testing only.
    return {
        "distance_miles": 436.0,
        "duration_hours": 7.5,
        "polyline": [
            [-118.2437, 34.0522],
            [-117.9153, 34.1064],
            [-117.6006, 34.2417],
            [-117.2902, 34.4138],
            [-116.9655, 34.5753],
            [-116.6108, 34.7417],
            [-116.2555, 34.8729],
            [-115.9518, 35.0456],
            [-115.6149, 35.2077],
            [-115.1398, 36.1699],
        ],
    }


def _has_coordinates(location):
    return (
        isinstance(location, dict)
        and location.get("lng") is not None
        and location.get("lat") is not None
    )

def _decode_ors_polyline(encoded: str):
    # ORS uses encoded polyline with precision 5
    coordinates = []
    index = lat = lng = 0
    length = len(encoded)

    while index < length:
        shift = result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        # precision 5
        coordinates.append([lng / 1e5, lat / 1e5])

    return coordinates

def get_route(pickup, dropoff):
    if not _has_coordinates(pickup) or not _has_coordinates(dropoff):
        print("get_route: missing coords", pickup, dropoff)
        return get_mock_route(None, pickup, dropoff)

    ors_api_key = os.getenv("ORS_API_KEY")
    if not ors_api_key:
        print("get_route: ORS_API_KEY missing")
        return get_mock_route(None, pickup, dropoff)


    url = "https://api.openrouteservice.org/v2/directions/driving-car"
    payload = {
        "coordinates": [
            [pickup["lng"], pickup["lat"]],
            [dropoff["lng"], dropoff["lat"]],
        ]
    }

    req = request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": ors_api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)

        if "features" in data and data["features"]:
            feature = data["features"][0]
            summary = feature["properties"]["summary"]
            coordinates = feature["geometry"]["coordinates"]

        elif "routes" in data and data["routes"]:
            r0 = data["routes"][0]
            summary = r0["summary"]
            coordinates = _decode_ors_polyline(r0["geometry"])

        else:
            print("ORS unexpected response:", data)
            return get_mock_route(None, pickup, dropoff)

        distance_miles = summary["distance"] / 1609.344
        duration_hours = summary["duration"] / 3600

        return {
            "distance_miles": round(distance_miles, 2),
            "duration_hours": round(duration_hours, 2),
            "polyline": coordinates,
        }

    except (KeyError, IndexError, TypeError, ValueError, error.URLError, error.HTTPError) as e:
        print("ORS routing failed, using mock route:", e)
        return get_mock_route(None, pickup, dropoff)
