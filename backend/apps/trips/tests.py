from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.trips.views import compute_summary_metrics
from utils.hos_engine import generate_hos_logs
from utils.stop_planner import plan_stops


def _polyline_for_miles(total_miles, step_miles=100):
    miles_per_degree_lng = 69.172
    points = []
    current = 0.0

    while current < total_miles:
        points.append([current / miles_per_degree_lng, 0.0])
        current += step_miles

    points.append([total_miles / miles_per_degree_lng, 0.0])
    return points


class PlanTripViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_plan_trip_uses_mock_route_and_contract_shape(self):
        response = self.client.post(
            "/api/trips/plan",
            {
                "current_location": "Los Angeles, CA",
                "pickup_location": "Barstow, CA",
                "dropoff_location": "Las Vegas, NV",
                "cycle_used_hours": 12,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()

        self.assertIn("route", body)
        self.assertIn("distance_miles", body["route"])
        self.assertIn("polyline", body["route"])
        self.assertNotIn("duration_hours", body["route"])
        self.assertIn("summary", body)
        self.assertEqual(body["summary"]["total_days"], 1)
        self.assertEqual(body["summary"]["total_miles"], body["route"]["distance_miles"])
        self.assertIn("stops", body)
        self.assertIn("logs", body)
        self.assertTrue(body["logs"])
        self.assertIn("remarks", body["logs"][0])

    def test_plan_trip_accepts_location_objects(self):
        response = self.client.post(
            "/api/trips/plan",
            {
                "current_location": {"label": "Los Angeles, CA", "lng": -118.2437, "lat": 34.0522},
                "pickup_location": {"label": "Barstow, CA", "lng": -117.0173, "lat": 34.8958},
                "dropoff_location": {"label": "Las Vegas, NV", "lng": -115.1398, "lat": 36.1699},
                "cycle_used_hours": 12,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("route", body)
        self.assertIn("summary", body)
        self.assertIn("stops", body)
        self.assertIn("logs", body)
        self.assertTrue(body["logs"])
        self.assertIn("remarks", body["logs"][0])

    @patch("apps.trips.views.get_route")
    @patch("apps.trips.views.plan_stops")
    @patch("apps.trips.views.generate_hos_logs")
    def test_plan_trip_total_days_uses_generated_logs_count(
        self, mock_generate_hos_logs, mock_plan_stops, mock_get_route
    ):
        mock_get_route.return_value = {
            "distance_miles": 100.0,
            "duration_hours": 2.0,
            "polyline": [[-120.0, 35.0], [-119.0, 36.0]],
        }
        mock_plan_stops.return_value = []
        mock_generate_hos_logs.return_value = [
            {"day": 1, "events": [], "remarks": []},
            {"day": 2, "events": [], "remarks": []},
            {"day": 3, "events": [], "remarks": []},
        ]

        response = self.client.post(
            "/api/trips/plan",
            {
                "current_location": "A",
                "pickup_location": "B",
                "dropoff_location": "C",
                "cycle_used_hours": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["summary"]["total_days"], 3)


class StopPlannerTests(TestCase):
    def _build_route(self, miles):
        return {
            "distance_miles": miles,
            "duration_hours": miles / 50.0,
            "polyline": _polyline_for_miles(miles),
        }

    def _pickup_dropoff(self, route):
        start = route["polyline"][0]
        end = route["polyline"][-1]
        pickup = {"label": "pickup", "lng": start[0], "lat": start[1]}
        dropoff = {"label": "dropoff", "lng": end[0], "lat": end[1]}
        return pickup, dropoff

    def test_short_trip_has_only_pickup_and_dropoff(self):
        route = self._build_route(300)
        pickup, dropoff = self._pickup_dropoff(route)

        stops = plan_stops(route, pickup, dropoff)
        stop_types = [stop["type"] for stop in stops]

        self.assertEqual(stop_types, ["pickup", "dropoff"])
        self.assertEqual(stops[0].get("mile"), 0)
        self.assertEqual(stops[-1].get("mile"), round(route["distance_miles"], 2))

    def test_medium_trip_has_one_break(self):
        route = self._build_route(600)
        pickup, dropoff = self._pickup_dropoff(route)

        stops = plan_stops(route, pickup, dropoff)
        stop_types = [stop["type"] for stop in stops]

        self.assertEqual(stop_types, ["pickup", "break", "dropoff"])
        self.assertEqual(stops[1].get("mile"), 400)

    def test_long_trip_has_break_and_fuel(self):
        route = self._build_route(1200)
        pickup, dropoff = self._pickup_dropoff(route)

        stops = plan_stops(route, pickup, dropoff)
        stop_types = [stop["type"] for stop in stops]

        self.assertEqual(stop_types, ["pickup", "break", "break", "fuel", "dropoff"])
        self.assertEqual(stops[1].get("mile"), 400)
        self.assertEqual(stops[2].get("mile"), 800)
        self.assertEqual(stops[3].get("mile"), 1000)

    def test_fuel_break_are_merged_when_within_10_miles(self):
        route = self._build_route(2200)
        pickup, dropoff = self._pickup_dropoff(route)

        stops = plan_stops(route, pickup, dropoff)
        fuel_stops = [stop for stop in stops if stop.get("type") == "fuel"]
        break_stops = [stop for stop in stops if stop.get("type") == "break"]

        self.assertTrue(fuel_stops)
        self.assertEqual(len(break_stops), 4)
        merged_fuel = next((stop for stop in fuel_stops if int(round(stop.get("mile", 0))) == 2000), None)
        self.assertIsNotNone(merged_fuel)
        self.assertTrue(merged_fuel.get("combined_break"))
        self.assertEqual(merged_fuel.get("reason"), "Fuel + 30-min break")
        self.assertEqual(merged_fuel.get("duration_minutes"), 45)

    def test_extremely_long_trip_has_multiple_stops_without_duplicates(self):
        route = self._build_route(2500)
        pickup, dropoff = self._pickup_dropoff(route)

        stops = plan_stops(route, pickup, dropoff)
        stop_types = [stop["type"] for stop in stops]
        coords = [(round(stop["lng"], 6), round(stop["lat"], 6)) for stop in stops]

        self.assertEqual(stop_types[0], "pickup")
        self.assertEqual(stop_types[-1], "dropoff")
        self.assertGreaterEqual(stop_types.count("break"), 5)
        self.assertGreaterEqual(stop_types.count("fuel"), 1)
        self.assertEqual(len(coords), len(set(coords)))
        self.assertEqual(stops[0].get("mile"), 0)
        self.assertEqual(stops[-1].get("mile"), round(route["distance_miles"], 2))


class HosEngineTests(TestCase):
    def _route(self, distance_miles):
        return {
            "distance_miles": distance_miles,
            "duration_hours": distance_miles / 50.0,
            "polyline": [],
        }

    def _assert_day_is_24h(self, day_log):
        events = day_log["events"]
        self.assertTrue(events)
        self.assertEqual(events[0]["start_minute"], 0)
        self.assertEqual(events[-1]["end_minute"], 1440)

        last_end = 0
        for event in events:
            self.assertGreaterEqual(event["start_minute"], last_end)
            self.assertGreater(event["end_minute"], event["start_minute"])
            last_end = event["end_minute"]

    def test_short_trip_produces_single_day_log(self):
        route = self._route(300)
        stops = []

        logs = generate_hos_logs(route, stops)

        self.assertEqual(len(logs), 1)
        self._assert_day_is_24h(logs[0])

    def test_medium_trip_includes_break_event(self):
        route = self._route(500)
        stops = [
            {"type": "pickup", "lng": -118.2, "lat": 34.0, "mile": 0},
            {"type": "break", "lng": -116.0, "lat": 35.0, "mile": 400},
            {"type": "dropoff", "lng": -115.1, "lat": 36.1, "mile": 500},
        ]

        logs = generate_hos_logs(route, stops)
        break_events = [
            event
            for day in logs
            for event in day["events"]
            if event["status"] == "off_duty" and (event["end_minute"] - event["start_minute"]) == 30
        ]

        self.assertEqual(len(logs), 1)
        self.assertTrue(break_events)
        self._assert_day_is_24h(logs[0])
        reasons = [remark["reason"] for remark in logs[0]["remarks"]]
        self.assertIn("Pre-trip", reasons)
        self.assertIn("30-min break", reasons)
        self.assertIn("Post-trip", reasons)

    def test_long_trip_spans_multiple_days(self):
        route = self._route(1500)
        stops = [
            {"type": "pickup", "lng": -118.2, "lat": 34.0, "mile": 0},
            {"type": "break", "lng": -117.0, "lat": 34.5, "mile": 400},
            {"type": "break", "lng": -116.0, "lat": 35.0, "mile": 800},
            {"type": "fuel", "lng": -115.5, "lat": 35.6, "mile": 1000},
            {"type": "break", "lng": -114.8, "lat": 36.0, "mile": 1200},
            {"type": "dropoff", "lng": -114.2, "lat": 36.4, "mile": 1500},
        ]

        logs = generate_hos_logs(route, stops)

        self.assertGreaterEqual(len(logs), 2)
        for day in logs:
            self._assert_day_is_24h(day)
            self.assertIn("remarks", day)

    def test_max_11_hour_driving_limit_is_enforced_per_day(self):
        route = self._route(1300)
        stops = [
            {"type": "pickup", "lng": -118.2, "lat": 34.0, "mile": 0},
            {"type": "break", "lng": -117.0, "lat": 34.5, "mile": 400},
            {"type": "break", "lng": -116.0, "lat": 35.0, "mile": 800},
            {"type": "fuel", "lng": -115.5, "lat": 35.6, "mile": 1000},
            {"type": "dropoff", "lng": -114.5, "lat": 36.3, "mile": 1300},
        ]

        logs = generate_hos_logs(route, stops)

        for day in logs:
            driving_minutes = sum(
                event["end_minute"] - event["start_minute"]
                for event in day["events"]
                if event["status"] == "driving"
            )
            self.assertLessEqual(driving_minutes, 11 * 60)

    def test_remarks_minutes_match_stop_start_times(self):
        route = self._route(500)
        stops = [
            {"type": "pickup", "lng": -118.2, "lat": 34.0, "mile": 0, "label": "Los Angeles"},
            {"type": "break", "lng": -116.0, "lat": 35.0, "mile": 400},
            {"type": "dropoff", "lng": -115.1, "lat": 36.1, "mile": 500, "label": "Las Vegas"},
        ]

        logs = generate_hos_logs(route, stops)
        day1 = logs[0]
        remarks_by_reason = {remark["reason"]: remark for remark in day1["remarks"]}

        self.assertEqual(remarks_by_reason["Pre-trip"]["minute"], 0)
        self.assertEqual(remarks_by_reason["30-min break"]["minute"], 540)
        self.assertEqual(remarks_by_reason["Post-trip"]["minute"], 690)

    def test_combined_fuel_break_remark_uses_45_minutes(self):
        route = self._route(1200)
        stops = [
            {"type": "pickup", "lng": -118.2, "lat": 34.0, "mile": 0, "label": "Los Angeles"},
            {
                "type": "fuel",
                "lng": -115.5,
                "lat": 35.6,
                "mile": 1000,
                "combined_break": True,
                "reason": "Fuel + 30-min break",
                "duration_minutes": 45,
            },
            {"type": "dropoff", "lng": -114.5, "lat": 36.3, "mile": 1200, "label": "Las Vegas"},
        ]

        logs = generate_hos_logs(route, stops)
        all_remarks = [remark for day in logs for remark in day["remarks"]]
        combined = next(remark for remark in all_remarks if remark["stop_type"] == "fuel")

        self.assertEqual(combined["reason"], "Fuel + 30-min break")
        self.assertEqual(combined["end_minute"] - combined["start_minute"], 45)


class SummaryMetricsTests(TestCase):
    def test_compute_summary_metrics_non_compliant_when_cycle_exceeds_70(self):
        days = [
            {
                "day": 1,
                "events": [
                    {"status": "driving", "start_minute": 0, "end_minute": 120},
                ],
                "remarks": [],
            }
        ]

        summary = compute_summary_metrics(days, 69)

        self.assertEqual(summary["driving_hours"], 2.0)
        self.assertFalse(summary["hos_compliant"])
        self.assertEqual(summary["hos_reasons"], ["Insufficient cycle hours remaining"])
        self.assertEqual(summary["cycle_remaining_hours_before"], 1.0)
        self.assertEqual(summary["cycle_remaining_hours_after"], -1.0)

    def test_compute_summary_metrics_compliant_when_cycle_within_70(self):
        days = [
            {
                "day": 1,
                "events": [
                    {"status": "driving", "start_minute": 60, "end_minute": 540},
                ],
                "remarks": [],
            }
        ]

        summary = compute_summary_metrics(days, 10)

        self.assertEqual(summary["driving_hours"], 8.0)
        self.assertTrue(summary["hos_compliant"])
        self.assertEqual(summary["hos_reasons"], [])
        self.assertEqual(summary["cycle_remaining_hours_before"], 60.0)
        self.assertEqual(summary["cycle_remaining_hours_after"], 52.0)
